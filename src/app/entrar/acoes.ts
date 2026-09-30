"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { enderecoDeVoltaSeguro } from "@/lib/permissoes";

export type EstadoEntrar = { erro?: string; email?: string } | undefined;

export async function entrar(_estado: EstadoEntrar, dados: FormData): Promise<EstadoEntrar> {
  const email = String(dados.get("email") ?? "");
  const voltar = enderecoDeVoltaSeguro(dados.get("voltar"));
  try {
    // Sem "voltar", a página /entrar leva cada perfil para a sua área.
    await signIn("credentials", {
      email,
      senha: String(dados.get("senha") ?? ""),
      redirectTo: voltar ?? "/entrar",
    });
  } catch (erro) {
    // Compara pelo tipo, e não pela classe, porque o Auth.js pode vir empacotado em mais de uma cópia.
    if (erro instanceof AuthError && erro.type === "CredentialsSignin" && "code" in erro && erro.code === "bloqueado") {
      return { email, erro: "Muitas tentativas erradas. Espere 15 minutos e tente de novo." };
    }
    if (erro instanceof AuthError) {
      return { email, erro: "E-mail ou senha incorretos." };
    }
    throw erro; // o redirecionamento depois do login também passa por aqui
  }
}
