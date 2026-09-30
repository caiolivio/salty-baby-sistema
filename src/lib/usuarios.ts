import "server-only";
import { prisma } from "./banco";
import { criarLimitador } from "./limitador";
import type { Perfil } from "./permissoes";
import { conferirSenha, gerarHash, normalizarEmail } from "./senha";

const limitador = criarLimitador();

// Hash de uma senha qualquer, usado quando o e-mail não existe, para que a
// resposta demore o mesmo tempo e não revele quais e-mails têm cadastro.
const HASH_FICTICIO = "$2b$12$IEDeWDYUAs4YYnEzPxFs1.SRZjkPfKjus8aSUeQSArbBy3Lg0KkHq";

export type ResultadoLogin =
  | { ok: true; usuario: { id: string; nome: string; email: string } }
  | { ok: false; motivo: "credenciais" | "bloqueado" };

export async function verificarCredenciais(emailDigitado: string, senha: string): Promise<ResultadoLogin> {
  const email = normalizarEmail(emailDigitado);
  if (limitador.esperaRestante(email) > 0) return { ok: false, motivo: "bloqueado" };

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const senhaConfere = await conferirSenha(senha, usuario?.senhaHash ?? HASH_FICTICIO);

  if (!usuario || !usuario.ativo || !senhaConfere) {
    limitador.registrarFalha(email);
    return { ok: false, motivo: limitador.esperaRestante(email) > 0 ? "bloqueado" : "credenciais" };
  }

  limitador.registrarSucesso(email);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcessoEm: new Date() } });
  return { ok: true, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } };
}

export type UsuarioLogado = { id: string; nome: string; email: string; perfis: Perfil[] };

/** Lê o usuário direto do banco: quem for desativado perde o acesso na hora. */
export async function buscarUsuarioAtivo(id: string): Promise<UsuarioLogado | null> {
  const usuario = await prisma.usuario.findUnique({ where: { id }, include: { perfis: true } });
  if (!usuario?.ativo) return null;
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfis: usuario.perfis.map((p) => p.perfil),
  };
}

export async function existeAdministradora(): Promise<boolean> {
  const total = await prisma.usuarioPerfil.count({ where: { perfil: "administradora" } });
  return total > 0;
}

/**
 * Cria a primeira administradora. Só funciona enquanto não existir nenhuma, e a
 * verificação acontece dentro da mesma transação da criação.
 */
export async function criarPrimeiraAdministradora(dados: { nome: string; email: string; senha: string }) {
  const senhaHash = await gerarHash(dados.senha);
  return prisma.$transaction(async (tx) => {
    const jaExiste = await tx.usuarioPerfil.count({ where: { perfil: "administradora" } });
    if (jaExiste > 0) return { ok: false as const, motivo: "ja-existe" as const };
    const email = normalizarEmail(dados.email);
    if (await tx.usuario.findUnique({ where: { email } })) {
      return { ok: false as const, motivo: "email-em-uso" as const };
    }
    const usuario = await tx.usuario.create({
      data: { nome: dados.nome.trim(), email, senhaHash, perfis: { create: { perfil: "administradora" } } },
    });
    return { ok: true as const, id: usuario.id };
  }, { isolationLevel: "Serializable" });
}
