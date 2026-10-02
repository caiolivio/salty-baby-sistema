"use server";

import { signIn } from "@/auth";
import { codigoValido, lerNovaSenha } from "@/lib/clientes/conta";
import { usarLinkDeSenha } from "@/lib/clientes/contas";

export type EstadoCriarSenha = { erro: string } | undefined;

// Página pública, protegida pelo código do link (que só a pessoa recebeu).
export async function criarSenha(_estado: EstadoCriarSenha, dados: FormData): Promise<EstadoCriarSenha> {
  const codigo = dados.get("codigo");
  if (!codigoValido(codigo)) return { erro: "Este link não vale mais. Peça um novo à loja." };
  const lido = lerNovaSenha(Object.fromEntries(dados.entries()));
  if (!lido.ok) return { erro: lido.erro };
  const usuario = await usarLinkDeSenha(codigo, lido.dados);
  if (!usuario) return { erro: "Este link já foi usado ou venceu. Peça um novo à loja." };
  // Sem "redirectTo" próprio: a página /entrar leva cada perfil para a sua área.
  await signIn("credentials", { email: usuario.email, senha: lido.dados, redirectTo: "/entrar" });
}
