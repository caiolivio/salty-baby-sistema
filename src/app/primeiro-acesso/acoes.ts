"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import { codigoConfere } from "@/lib/codigo-primeiro-acesso";
import { problemaNaSenha } from "@/lib/senha";
import { criarPrimeiraAdministradora, existeAdministradora } from "@/lib/usuarios";

export type EstadoPrimeiroAcesso = { erro?: string; nome?: string; email?: string } | undefined;

const campos = z.object({
  codigo: z.string(),
  nome: z.string().trim().min(2, "Escreva o seu nome.").max(120),
  email: z.email("Confira o e-mail.").trim().max(191),
  senha: z.string(),
  confirmacao: z.string(),
});

export async function criarAdministradora(
  _estado: EstadoPrimeiroAcesso,
  dados: FormData,
): Promise<EstadoPrimeiroAcesso> {
  if (await existeAdministradora()) redirect("/entrar");

  const lido = campos.safeParse(Object.fromEntries(dados));
  const nome = String(dados.get("nome") ?? "");
  const email = String(dados.get("email") ?? "");
  if (!lido.success) return { nome, email, erro: lido.error.issues[0]?.message ?? "Confira os campos." };

  const { codigo, senha, confirmacao } = lido.data;
  if (!codigoConfere(codigo, process.env.CODIGO_PRIMEIRO_ACESSO)) {
    return { nome, email, erro: "Código de primeiro acesso incorreto." };
  }
  const problema = problemaNaSenha(senha);
  if (problema) return { nome, email, erro: problema };
  if (senha !== confirmacao) return { nome, email, erro: "As duas senhas não são iguais." };

  const resultado = await criarPrimeiraAdministradora({ nome: lido.data.nome, email: lido.data.email, senha });
  if (!resultado.ok) {
    if (resultado.motivo === "ja-existe") redirect("/entrar");
    return { nome, email, erro: "Este e-mail já tem cadastro." };
  }

  await signIn("credentials", { email: lido.data.email, senha, redirectTo: "/painel" });
}
