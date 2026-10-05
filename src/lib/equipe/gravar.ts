import "server-only";
import { prisma } from "../banco";
import { gerarCodigoDoLink } from "../clientes/conta";
import { contaComPerfil, gravarLinkDeSenha } from "../clientes/contas";
import { registrar, registrarCadastro } from "../historico/gravar";
import type { Autor } from "../historico/regras";
import { acessoDaEquipe } from "../permissoes";
import { mudancasDeAcesso, type DadosSuporte } from "./regras";

type Permissao = { chave: string; nivel: string };

/** Administradoras e suportes, com o que cada suporte pode usar. */
export async function listarEquipe() {
  const usuarios = await prisma.usuario.findMany({
    where: { perfis: { some: { perfil: { in: ["administradora", "ajudante"] } } } },
    include: { perfis: true, permissoes: true },
    orderBy: { nome: "asc" },
  });
  return usuarios.map((u) => {
    const perfis = u.perfis.map((p) => p.perfil);
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      whatsapp: u.whatsapp,
      ultimoAcessoEm: u.ultimoAcessoEm,
      administradora: perfis.includes("administradora"),
      acesso: acessoDaEquipe(perfis, u.permissoes),
    };
  });
}

/** Uma pessoa da equipe (suporte ou administradora). */
export async function buscarSuporte(id: string) {
  const u = await prisma.usuario.findFirst({
    where: { id, ativo: true, perfis: { some: { perfil: { in: ["administradora", "ajudante"] } } } },
    include: { perfis: true, permissoes: true },
  });
  if (!u) return null;
  const perfis = u.perfis.map((p) => p.perfil);
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    whatsapp: u.whatsapp,
    ultimoAcessoEm: u.ultimoAcessoEm,
    administradora: perfis.includes("administradora"),
    outrosPerfis: perfis.filter((p) => p !== "ajudante" && p !== "administradora"),
    acesso: acessoDaEquipe(perfis, u.permissoes),
  };
}

export type ResultadoNovoSuporte =
  | { ok: true; id: string; codigo: string | null }
  | { ok: false; motivo: "ja-na-equipe" };

/**
 * Cria o suporte (ou dá o perfil de suporte a quem já tem conta no site, como
 * uma cliente). Conta nova recebe um link para criar a senha; quem já tem conta
 * entra com a senha de sempre.
 */
export async function criarSuporte(
  dados: DadosSuporte,
  permissoes: readonly Permissao[],
  autor: Autor,
  agora = new Date(),
): Promise<ResultadoNovoSuporte> {
  const codigo = gerarCodigoDoLink();
  return prisma.$transaction(
    async (tx) => {
      const existente = await tx.usuario.findUnique({ where: { email: dados.email }, include: { perfis: true } });
      if (existente?.perfis.some((p) => p.perfil === "ajudante" || p.perfil === "administradora")) {
        return { ok: false as const, motivo: "ja-na-equipe" as const };
      }
      const conta = await contaComPerfil(tx, { nome: dados.nome, email: dados.email }, "ajudante");
      // Quem saiu da equipe antes ficou com a conta desativada: volta a valer, com senha nova.
      const precisaDeSenha = conta.nova || existente?.ativo === false;
      await tx.usuario.update({ where: { id: conta.id }, data: { whatsapp: dados.whatsapp, ativo: true } });
      await tx.permissaoEquipe.deleteMany({ where: { usuarioId: conta.id } });
      await tx.permissaoEquipe.createMany({ data: permissoes.map((p) => ({ usuarioId: conta.id, ...p })) });
      const registro = { tabela: "equipe" as const, id: conta.id, rotulo: `${dados.nome} (${dados.email})` };
      await registrarCadastro(tx, registro, conta.nova ? "Suporte cadastrado" : "Conta do site virou suporte", autor);
      await registrar(tx, registro, mudancasDeAcesso(acessoDaEquipe(["ajudante"], []), acessoDaEquipe(["ajudante"], permissoes)), autor);
      if (precisaDeSenha) await gravarLinkDeSenha(tx, conta.id, codigo, agora);
      return { ok: true as const, id: conta.id, codigo: precisaDeSenha ? codigo : null };
    },
    { isolationLevel: "Serializable" },
  );
}

/** Muda nome, WhatsApp e o que o suporte pode usar. Vale na hora, até para quem já está logado. */
export async function salvarSuporte(
  id: string,
  dados: { nome: string; whatsapp: string | null },
  permissoes: readonly Permissao[],
  autor: Autor,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const u = await tx.usuario.findFirst({
      where: { id, perfis: { some: { perfil: "ajudante" } } },
      include: { perfis: true, permissoes: true },
    });
    if (!u) return false;
    const perfis = u.perfis.map((p) => p.perfil);
    const registro = { tabela: "equipe" as const, id, rotulo: `${dados.nome} (${u.email})` };
    const mudancas = mudancasDeAcesso(acessoDaEquipe(perfis, u.permissoes), acessoDaEquipe(perfis, permissoes));
    if (u.nome !== dados.nome) mudancas.unshift({ campo: "Nome", antes: u.nome, depois: dados.nome, restrito: false });
    if (u.whatsapp !== dados.whatsapp) {
      mudancas.unshift({ campo: "WhatsApp", antes: u.whatsapp, depois: dados.whatsapp, restrito: false });
    }
    await tx.usuario.update({ where: { id }, data: { nome: dados.nome, whatsapp: dados.whatsapp } });
    await tx.permissaoEquipe.deleteMany({ where: { usuarioId: id } });
    await tx.permissaoEquipe.createMany({ data: permissoes.map((p) => ({ usuarioId: id, ...p })) });
    await registrar(tx, registro, mudancas, autor, "Equipe");
    return true;
  });
}

/** Tira a pessoa da equipe: ela perde o painel na hora. Se também é cliente ou fornecedora, isso continua. */
export async function tirarDaEquipe(id: string, autor: Autor): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const u = await tx.usuario.findFirst({ where: { id, perfis: { some: { perfil: "ajudante" } } }, include: { perfis: true } });
    if (!u) return false;
    await tx.permissaoEquipe.deleteMany({ where: { usuarioId: id } });
    await tx.usuarioPerfil.delete({ where: { usuarioId_perfil: { usuarioId: id, perfil: "ajudante" } } });
    // Conta só de suporte: fica desativada (não serve para mais nada).
    if (u.perfis.length === 1) await tx.usuario.update({ where: { id }, data: { ativo: false } });
    await registrar(
      tx,
      { tabela: "equipe", id, rotulo: `${u.nome} (${u.email})` },
      [{ campo: "Equipe", antes: "Suporte", depois: "Saiu da equipe", restrito: false }],
      autor,
    );
    return true;
  });
}

/** Link novo para o suporte (ou outra administradora) criar a senha (esqueceu ou ainda não criou). */
export async function linkDeSenhaDoSuporte(id: string, agora = new Date()): Promise<string | null> {
  const codigo = gerarCodigoDoLink();
  return prisma.$transaction(async (tx) => {
    const u = await tx.usuario.findFirst({
      where: { id, ativo: true, perfis: { some: { perfil: { in: ["administradora", "ajudante"] } } } },
    });
    if (!u) return null;
    await gravarLinkDeSenha(tx, id, codigo, agora);
    return codigo;
  });
}

export type ResultadoNovaAdministradora =
  | { ok: true; id: string; codigo: string | null }
  | { ok: false; motivo: "ja-administradora" };

/**
 * Cadastra outra administradora, com todos os poderes. Quem já tem conta no
 * site (cliente, fornecedora ou suporte) ganha o perfil e entra com a senha de
 * sempre; o suporte deixa de ter a lista de páginas, porque passa a ver tudo.
 */
export async function criarAdministradora(
  dados: DadosSuporte,
  autor: Autor,
  agora = new Date(),
): Promise<ResultadoNovaAdministradora> {
  const codigo = gerarCodigoDoLink();
  return prisma.$transaction(
    async (tx) => {
      const existente = await tx.usuario.findUnique({ where: { email: dados.email }, include: { perfis: true } });
      if (existente?.ativo && existente.perfis.some((p) => p.perfil === "administradora")) {
        return { ok: false as const, motivo: "ja-administradora" as const };
      }
      const eraSuporte = Boolean(existente?.perfis.some((p) => p.perfil === "ajudante"));
      const conta = await contaComPerfil(tx, { nome: dados.nome, email: dados.email }, "administradora");
      const precisaDeSenha = conta.nova || existente?.ativo === false;
      await tx.usuario.update({ where: { id: conta.id }, data: { whatsapp: dados.whatsapp ?? existente?.whatsapp ?? null, ativo: true } });
      if (eraSuporte) {
        await tx.permissaoEquipe.deleteMany({ where: { usuarioId: conta.id } });
        await tx.usuarioPerfil.delete({ where: { usuarioId_perfil: { usuarioId: conta.id, perfil: "ajudante" } } });
      }
      const registro = { tabela: "equipe" as const, id: conta.id, rotulo: `${dados.nome} (${dados.email})` };
      await registrar(
        tx,
        registro,
        [{ campo: "Equipe", antes: eraSuporte ? "Suporte" : null, depois: "Administradora (todos os poderes)", restrito: false }],
        autor,
        conta.nova ? "Administradora cadastrada" : "Conta virou administradora",
      );
      if (precisaDeSenha) await gravarLinkDeSenha(tx, conta.id, codigo, agora);
      return { ok: true as const, id: conta.id, codigo: precisaDeSenha ? codigo : null };
    },
    { isolationLevel: "Serializable" },
  );
}

/** Muda nome e WhatsApp de outra administradora. */
export async function salvarAdministradora(id: string, dados: { nome: string; whatsapp: string | null }, autor: Autor) {
  return prisma.$transaction(async (tx) => {
    const u = await tx.usuario.findFirst({ where: { id, ativo: true, perfis: { some: { perfil: "administradora" } } } });
    if (!u) return false;
    const mudancas = [];
    if (u.nome !== dados.nome) mudancas.push({ campo: "Nome", antes: u.nome, depois: dados.nome, restrito: false });
    if (u.whatsapp !== dados.whatsapp) mudancas.push({ campo: "WhatsApp", antes: u.whatsapp, depois: dados.whatsapp, restrito: false });
    await tx.usuario.update({ where: { id }, data: { nome: dados.nome, whatsapp: dados.whatsapp } });
    await registrar(tx, { tabela: "equipe", id, rotulo: `${dados.nome} (${u.email})` }, mudancas, autor, "Equipe");
    return true;
  });
}

export type ResultadoTirarAdministradora = { ok: true } | { ok: false; erro: string };

/**
 * Tira o perfil de administradora de outra pessoa. Ninguém tira a si mesma, e
 * a loja nunca fica sem nenhuma administradora.
 */
export async function tirarAdministradora(id: string, autor: Autor): Promise<ResultadoTirarAdministradora> {
  if (id === autor.usuarioId) return { ok: false, erro: "Você não pode tirar a si mesma. Peça para outra administradora." };
  return prisma.$transaction(
    async (tx) => {
      const u = await tx.usuario.findFirst({ where: { id, perfis: { some: { perfil: "administradora" } } }, include: { perfis: true } });
      if (!u) return { ok: false as const, erro: "Esta pessoa não é mais administradora." };
      const outras = await tx.usuarioPerfil.count({
        where: { perfil: "administradora", usuarioId: { not: id }, usuario: { ativo: true } },
      });
      if (outras === 0) return { ok: false as const, erro: "A loja precisa de pelo menos uma administradora." };
      await tx.usuarioPerfil.delete({ where: { usuarioId_perfil: { usuarioId: id, perfil: "administradora" } } });
      if (u.perfis.length === 1) await tx.usuario.update({ where: { id }, data: { ativo: false } });
      await registrar(
        tx,
        { tabela: "equipe", id, rotulo: `${u.nome} (${u.email})` },
        [{ campo: "Equipe", antes: "Administradora", depois: "Saiu da equipe", restrito: false }],
        autor,
      );
      return { ok: true as const };
    },
    { isolationLevel: "Serializable" },
  );
}
