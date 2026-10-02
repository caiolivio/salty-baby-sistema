import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../banco";
import { lerTelefoneCliente } from "../pedidos/regras";
import { conferirSenha, gerarHash } from "../senha";
import { fimDoLink, gerarCodigoDoLink, hashDoCodigo, type DadosCadastro, type DadosPerfil } from "./conta";
import { registrar } from "../historico/gravar";
import { CAMPOS_CLIENTE, compararParcial } from "../historico/regras";

// Contas das clientes no site. Cada conta (usuário com perfil "cliente") fica
// ligada a uma ficha da tabela clientes, a mesma que a loja usa no painel.

/** Ficha de cliente de quem está logado (ou nada, se ainda não tiver). */
export async function clienteDoUsuario(usuarioId: string) {
  return prisma.cliente.findUnique({
    where: { usuarioId },
    select: { id: true, nome: true, telefone: true, email: true },
  });
}

/**
 * Ficha com este WhatsApp. Compara só os números, porque fichas antigas (do
 * Notion) podem ter o telefone guardado com parênteses e traço.
 */
async function fichaPeloWhatsapp(tx: Prisma.TransactionClient, digitos: string, exceto?: string) {
  const comTelefone = await tx.cliente.findMany({
    where: { telefone: { not: null }, ...(exceto && { id: { not: exceto } }) },
    orderBy: { criadoEm: "asc" },
    select: { id: true, telefone: true, email: true, usuarioId: true },
  });
  return comTelefone.find((c) => lerTelefoneCliente(c.telefone) === digitos);
}

/**
 * Ficha de quem tem o perfil de cliente. Quem ganhou o perfil sem ficha (por
 * exemplo, uma fornecedora) recebe uma ficha nova com o nome e o e-mail da conta.
 */
export async function fichaDaCliente(usuario: { id: string; nome: string; email: string }) {
  const ficha = await clienteDoUsuario(usuario.id);
  if (ficha) return ficha;
  try {
    return await prisma.cliente.create({
      data: { nome: usuario.nome, email: usuario.email, usuarioId: usuario.id },
      select: { id: true, nome: true, telefone: true, email: true },
    });
  } catch {
    // Duas abas ao mesmo tempo: a outra já criou.
    return prisma.cliente.findUniqueOrThrow({
      where: { usuarioId: usuario.id },
      select: { id: true, nome: true, telefone: true, email: true },
    });
  }
}

export type ResultadoCadastro =
  | { ok: true; usuarioId: string }
  | { ok: false; motivo: "email-em-uso" | "whatsapp-com-conta" | "whatsapp-no-cadastro" };

/**
 * Cadastro feito pela própria cliente. Se o WhatsApp já está no cadastro da
 * loja (compras antigas), a conta só é ligada a essa ficha quando o e-mail
 * também bate; senão a loja libera o acesso pelo painel. Assim ninguém vê as
 * compras de outra pessoa só por saber o número dela.
 */
export async function criarContaDeCliente(dados: DadosCadastro): Promise<ResultadoCadastro> {
  const senhaHash = await gerarHash(dados.senha);
  return prisma.$transaction(
    async (tx) => {
      if (await tx.usuario.findUnique({ where: { email: dados.email } })) {
        return { ok: false as const, motivo: "email-em-uso" as const };
      }
      const ficha = await fichaPeloWhatsapp(tx, dados.telefone);
      if (ficha?.usuarioId) return { ok: false as const, motivo: "whatsapp-com-conta" as const };
      if (ficha && ficha.email?.toLowerCase() !== dados.email) {
        return { ok: false as const, motivo: "whatsapp-no-cadastro" as const };
      }
      const usuario = await tx.usuario.create({
        data: { nome: dados.nome, email: dados.email, senhaHash, perfis: { create: { perfil: "cliente" } } },
      });
      if (ficha) {
        await tx.cliente.update({ where: { id: ficha.id }, data: { usuarioId: usuario.id, telefone: dados.telefone } });
      } else {
        await tx.cliente.create({
          data: { nome: dados.nome, email: dados.email, telefone: dados.telefone, usuarioId: usuario.id },
        });
      }
      return { ok: true as const, usuarioId: usuario.id };
    },
    { isolationLevel: "Serializable" },
  );
}

export type ResultadoAcesso =
  | { ok: true; codigo: string; novaConta: boolean }
  | { ok: false; motivo: "sem-cliente" | "email-de-outra-cliente" };

/**
 * A loja cria o acesso de uma cliente do cadastro (ou gera um link novo para
 * quem esqueceu a senha). A senha fica impossível de adivinhar até a cliente
 * criar a dela pelo link. Se o e-mail já é de um usuário do sistema (uma
 * fornecedora, por exemplo), ele ganha também o perfil de cliente.
 */
export async function criarAcessoPelaLoja(clienteId: string, email: string, agora = new Date()): Promise<ResultadoAcesso> {
  const senhaHash = await gerarHash(randomBytes(24).toString("base64url"));
  const codigo = gerarCodigoDoLink();
  return prisma.$transaction(
    async (tx) => {
      const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
      if (!cliente) return { ok: false as const, motivo: "sem-cliente" as const };

      let usuarioId = cliente.usuarioId;
      let novaConta = false;
      if (!usuarioId) {
        const existente = await tx.usuario.findUnique({ where: { email }, include: { cliente: true } });
        if (existente?.cliente) return { ok: false as const, motivo: "email-de-outra-cliente" as const };
        if (existente) {
          await tx.usuarioPerfil.upsert({
            where: { usuarioId_perfil: { usuarioId: existente.id, perfil: "cliente" } },
            create: { usuarioId: existente.id, perfil: "cliente" },
            update: {},
          });
          usuarioId = existente.id;
        } else {
          const criado = await tx.usuario.create({
            data: { nome: cliente.nome, email, senhaHash, perfis: { create: { perfil: "cliente" } } },
          });
          usuarioId = criado.id;
          novaConta = true;
        }
        await tx.cliente.update({ where: { id: cliente.id }, data: { usuarioId, email: cliente.email ?? email } });
      }
      await gravarLinkDeSenha(tx, usuarioId, codigo, agora);
      return { ok: true as const, codigo, novaConta };
    },
    { isolationLevel: "Serializable" },
  );
}

/** Grava um link de criar senha. Um link novo cancela os anteriores que ainda não foram usados. */
export async function gravarLinkDeSenha(tx: Prisma.TransactionClient, usuarioId: string, codigo: string, agora: Date) {
  await tx.linkDeSenha.updateMany({ where: { usuarioId, usadoEm: null }, data: { usadoEm: agora } });
  await tx.linkDeSenha.create({ data: { usuarioId, codigoHash: hashDoCodigo(codigo), expiraEm: fimDoLink(agora) } });
}

/**
 * Conta para um e-mail com o perfil pedido: usa a que já existe (somando o
 * perfil) ou cria uma com senha impossível de adivinhar, até a pessoa criar a
 * dela pelo link.
 */
export async function contaComPerfil(
  tx: Prisma.TransactionClient,
  dados: { nome: string; email: string },
  perfil: "cliente" | "fornecedora",
): Promise<{ id: string; nova: boolean }> {
  const existente = await tx.usuario.findUnique({ where: { email: dados.email } });
  if (existente) {
    await tx.usuarioPerfil.upsert({
      where: { usuarioId_perfil: { usuarioId: existente.id, perfil } },
      create: { usuarioId: existente.id, perfil },
      update: {},
    });
    return { id: existente.id, nova: false };
  }
  const senhaHash = await gerarHash(randomBytes(24).toString("base64url"));
  const criado = await tx.usuario.create({
    data: { nome: dados.nome, email: dados.email, senhaHash, perfis: { create: { perfil } } },
  });
  return { id: criado.id, nova: true };
}

/** Link de criar senha ainda válido: devolve de quem é. */
export async function buscarLinkDeSenha(codigo: string, agora = new Date()) {
  const link = await prisma.linkDeSenha.findUnique({
    where: { codigoHash: hashDoCodigo(codigo) },
    include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
  });
  if (!link || link.usadoEm || link.expiraEm <= agora || !link.usuario.ativo) return null;
  return link.usuario;
}

/** Usa o link: grava a senha nova e o link deixa de valer (só funciona uma vez). */
export async function usarLinkDeSenha(codigo: string, senha: string, agora = new Date()) {
  const senhaHash = await gerarHash(senha);
  return prisma.$transaction(async (tx) => {
    const usado = await tx.linkDeSenha.updateMany({
      where: { codigoHash: hashDoCodigo(codigo), usadoEm: null, expiraEm: { gt: agora } },
      data: { usadoEm: agora },
    });
    if (usado.count === 0) return null;
    const link = await tx.linkDeSenha.findUniqueOrThrow({
      where: { codigoHash: hashDoCodigo(codigo) },
      select: { usuario: { select: { id: true, email: true } } },
    });
    await tx.usuario.update({ where: { id: link.usuario.id }, data: { senhaHash } });
    return link.usuario;
  });
}

export type ResultadoPerfil = { ok: true } | { ok: false; motivo: "email-em-uso" | "whatsapp-em-uso" };

/** A cliente atualiza nome, e-mail e WhatsApp (na conta e na ficha da loja). */
export async function atualizarPerfil(usuarioId: string, clienteId: string, dados: DadosPerfil): Promise<ResultadoPerfil> {
  return prisma.$transaction(
    async (tx) => {
      const outroEmail = await tx.usuario.findFirst({ where: { email: dados.email, id: { not: usuarioId } } });
      if (outroEmail) return { ok: false as const, motivo: "email-em-uso" as const };
      const outroWhats = await fichaPeloWhatsapp(tx, dados.telefone, clienteId);
      if (outroWhats) return { ok: false as const, motivo: "whatsapp-em-uso" as const };
      await tx.usuario.update({ where: { id: usuarioId }, data: { nome: dados.nome, email: dados.email } });
      const antes = await tx.cliente.findUnique({ where: { id: clienteId } });
      await tx.cliente.update({ where: { id: clienteId }, data: dados });
      if (antes) {
        await registrar(
          tx,
          { tabela: "cliente", id: clienteId, rotulo: dados.nome },
          compararParcial(CAMPOS_CLIENTE, antes, dados),
          { usuarioId, nome: `${dados.nome} (cliente)` },
          "A cliente atualizou os dados na conta dela",
        );
      }
      return { ok: true as const };
    },
    { isolationLevel: "Serializable" },
  );
}

/** Troca de senha na área do cliente: pede a senha atual antes. */
export async function trocarSenha(usuarioId: string, atual: string, nova: string): Promise<boolean> {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { senhaHash: true } });
  if (!usuario || !(await conferirSenha(atual, usuario.senhaHash))) return false;
  await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash: await gerarHash(nova) } });
  return true;
}

/** Marca ou desmarca a peça como favorita. Devolve se ficou favorita. */
export async function alternarFavorito(clienteId: string, pecaId: string): Promise<boolean> {
  const apagados = await prisma.favorito.deleteMany({ where: { clienteId, pecaId } });
  if (apagados.count > 0) return false;
  const peca = await prisma.peca.findUnique({ where: { id: pecaId }, select: { id: true } });
  if (!peca) return false;
  await prisma.favorito.upsert({
    where: { clienteId_pecaId: { clienteId, pecaId } },
    create: { clienteId, pecaId },
    update: {},
  });
  return true;
}

/** Ids das peças favoritas de quem está vendo (vazio para quem não é cliente). */
export async function favoritosDoUsuario(usuarioId: string | undefined, pecaIds?: string[]): Promise<Set<string>> {
  if (!usuarioId) return new Set();
  const favoritos = await prisma.favorito.findMany({
    where: { cliente: { usuarioId }, ...(pecaIds && { pecaId: { in: pecaIds } }) },
    select: { pecaId: true },
  });
  return new Set(favoritos.map((f) => f.pecaId));
}
