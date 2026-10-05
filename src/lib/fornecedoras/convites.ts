import "server-only";
import { prisma } from "../banco";
import { fimDoLink, gerarCodigoDoLink, hashDoCodigo } from "../clientes/conta";
import { gravarLinkDeSenha } from "../clientes/contas";
import { conferirSenha, gerarHash } from "../senha";
import { versaoAtualDoAcordo } from "../paginas/servidor";
import type { DadosDaFornecedora } from "./conta";
import { registrar, rotuloDaFornecedora } from "../historico/gravar";
import { CAMPOS_FORNECEDORA, compararParcial } from "../historico/regras";

// Acesso das fornecedoras à área delas. As que já eram parceiras (importadas
// do Notion) recebem um link de primeiro acesso: terminam o cadastro, criam a
// senha, aceitam o acordo e só então veem o resto da área.

export type ResultadoConvite = { ok: true; tipo: "convite" | "nova-senha"; codigo: string } | { ok: false };

/**
 * Link para mandar no WhatsApp. Quem ainda não tem conta recebe o link de
 * primeiro acesso; quem já tem recebe um link para criar uma nova senha.
 */
export async function gerarAcessoDaFornecedora(fornecedoraId: string, agora = new Date()): Promise<ResultadoConvite> {
  const codigo = gerarCodigoDoLink();
  return prisma.$transaction(async (tx) => {
    const f = await tx.fornecedora.findUnique({ where: { id: fornecedoraId }, select: { usuarioId: true, ativa: true } });
    if (!f || !f.ativa) return { ok: false as const };
    if (f.usuarioId) {
      await gravarLinkDeSenha(tx, f.usuarioId, codigo, agora);
      return { ok: true as const, tipo: "nova-senha" as const, codigo };
    }
    // Um convite novo cancela os anteriores ainda não usados.
    await tx.conviteFornecedora.updateMany({ where: { fornecedoraId, usadoEm: null }, data: { usadoEm: agora } });
    await tx.conviteFornecedora.create({ data: { fornecedoraId, codigoHash: hashDoCodigo(codigo), expiraEm: fimDoLink(agora) } });
    return { ok: true as const, tipo: "convite" as const, codigo };
  });
}

/** Convite ainda válido: devolve os dados que a fornecedora já tem no cadastro. */
export async function buscarConvite(codigo: string, agora = new Date()) {
  const convite = await prisma.conviteFornecedora.findUnique({
    where: { codigoHash: hashDoCodigo(codigo) },
    include: {
      fornecedora: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          email: true,
          telefone: true,
          endereco: true,
          cep: true,
          cidade: true,
          estado: true,
          pix: true,
          ativa: true,
          usuarioId: true,
        },
      },
    },
  });
  if (!convite || convite.usadoEm || convite.expiraEm <= agora) return null;
  if (!convite.fornecedora.ativa || convite.fornecedora.usuarioId) return null;
  return convite.fornecedora;
}

export type ResultadoPrimeiroAcesso =
  | { ok: true; email: string }
  | { ok: false; motivo: "convite" | "email-de-outra-fornecedora" | "senha-da-conta" };

/**
 * Passo 1 do primeiro acesso: grava os dados e cria a conta. Se o e-mail já
 * tem conta no site (por exemplo, ela também é cliente), só liga quando a
 * senha digitada é a dessa conta, para ninguém tomar a conta de outra pessoa.
 */
export async function usarConvite(
  codigo: string,
  dados: DadosDaFornecedora,
  senha: string,
  agora = new Date(),
): Promise<ResultadoPrimeiroAcesso> {
  const senhaHash = await gerarHash(senha);
  return prisma.$transaction(
    async (tx) => {
      const convite = await tx.conviteFornecedora.findUnique({
        where: { codigoHash: hashDoCodigo(codigo) },
        select: { id: true, usadoEm: true, expiraEm: true, fornecedora: { select: { id: true, usuarioId: true, ativa: true } } },
      });
      if (!convite || convite.usadoEm || convite.expiraEm <= agora) return { ok: false as const, motivo: "convite" as const };
      const f = convite.fornecedora;
      if (f.usuarioId || !f.ativa) return { ok: false as const, motivo: "convite" as const };

      const existente = await tx.usuario.findUnique({
        where: { email: dados.email },
        select: { id: true, senhaHash: true, fornecedora: { select: { id: true } } },
      });
      let usuarioId: string;
      if (existente) {
        if (existente.fornecedora) return { ok: false as const, motivo: "email-de-outra-fornecedora" as const };
        if (!(await conferirSenha(senha, existente.senhaHash))) return { ok: false as const, motivo: "senha-da-conta" as const };
      }
      // Os erros acima não gastam o convite: ela pode corrigir e tentar de novo.
      const usado = await tx.conviteFornecedora.updateMany({ where: { id: convite.id, usadoEm: null }, data: { usadoEm: agora } });
      if (usado.count === 0) return { ok: false as const, motivo: "convite" as const };
      if (existente) {
        await tx.usuarioPerfil.upsert({
          where: { usuarioId_perfil: { usuarioId: existente.id, perfil: "fornecedora" } },
          create: { usuarioId: existente.id, perfil: "fornecedora" },
          update: {},
        });
        usuarioId = existente.id;
      } else {
        const criado = await tx.usuario.create({
          data: { nome: dados.nome, email: dados.email, senhaHash, perfis: { create: { perfil: "fornecedora" } } },
        });
        usuarioId = criado.id;
      }
      await tx.fornecedora.update({ where: { id: f.id }, data: { ...dados, usuarioId } });
      return { ok: true as const, email: dados.email };
    },
    { isolationLevel: "Serializable" },
  );
}

/** Dados que a própria fornecedora mantém (passo 1 dentro da área e "Meus dados"). */
export async function salvarDadosDaFornecedora(
  fornecedoraId: string,
  usuarioId: string,
  dados: DadosDaFornecedora,
): Promise<{ ok: true } | { ok: false; motivo: "email-em-uso" }> {
  return prisma.$transaction(async (tx) => {
    const outro = await tx.usuario.findFirst({ where: { email: dados.email, id: { not: usuarioId } } });
    if (outro) return { ok: false as const, motivo: "email-em-uso" as const };
    await tx.usuario.update({ where: { id: usuarioId }, data: { nome: dados.nome, email: dados.email } });
    const antes = await tx.fornecedora.findUnique({ where: { id: fornecedoraId } });
    await tx.fornecedora.update({ where: { id: fornecedoraId }, data: dados });
    if (antes) {
      await registrar(
        tx,
        { tabela: "fornecedora", id: fornecedoraId, rotulo: rotuloDaFornecedora({ codigo: antes.codigo, nome: dados.nome }) },
        compararParcial(CAMPOS_FORNECEDORA, antes, dados),
        { usuarioId, nome: `${dados.nome} (fornecedora ${antes.codigo})` },
        "A fornecedora atualizou os dados na área dela",
      );
    }
    return { ok: true as const };
  });
}

/** Passo 2 do primeiro acesso: aceite do acordo. */
export async function aceitarTermos(fornecedoraId: string, agora = new Date()): Promise<void> {
  await prisma.fornecedora.updateMany({
    where: { id: fornecedoraId, termosAceitosEm: null },
    data: { termosAceitosEm: agora, termosVersao: await versaoAtualDoAcordo() },
  });
}
