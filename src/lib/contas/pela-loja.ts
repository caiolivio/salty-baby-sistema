import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../banco";
import type { Mudanca } from "../historico/regras";
import { normalizarEmail } from "../senha";

// A administradora muda nome e e-mail de entrada (o login) de uma conta, a
// partir da ficha da cliente, da fornecedora, da inscrição ou da Equipe.

/** Já existe outra conta entrando com este e-mail? */
export async function emailDeEntradaEmUso(email: string, usuarioId: string): Promise<boolean> {
  const outra = await prisma.usuario.findFirst({ where: { email: normalizarEmail(email), id: { not: usuarioId } }, select: { id: true } });
  return Boolean(outra);
}

export const ERRO_EMAIL_EM_USO = "Já existe outra conta que entra com este e-mail. Use outro e-mail.";

/**
 * Atualiza a conta dentro da transação de quem chamou. E-mail vazio mantém o
 * de hoje (a conta precisa de um e-mail para entrar). Devolve as mudanças para o histórico.
 */
export async function atualizarContaPelaLoja(
  tx: Prisma.TransactionClient,
  usuarioId: string,
  dados: { nome?: string; email?: string | null },
): Promise<Mudanca[]> {
  const conta = await tx.usuario.findUnique({ where: { id: usuarioId }, select: { nome: true, email: true } });
  if (!conta) return [];
  const nome = dados.nome?.trim().slice(0, 120) || conta.nome;
  const email = dados.email?.trim() ? normalizarEmail(dados.email) : conta.email;
  if (nome === conta.nome && email === conta.email) return [];
  await tx.usuario.update({ where: { id: usuarioId }, data: { nome, email } });
  const mudancas: Mudanca[] = [];
  if (email !== conta.email) mudancas.push({ campo: "E-mail de entrada", antes: conta.email, depois: email, restrito: false });
  return mudancas;
}
