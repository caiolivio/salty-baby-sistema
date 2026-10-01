"use server";

import { headers } from "next/headers";
import { signIn } from "@/auth";
import { codigoValido, lerNovaSenha } from "@/lib/clientes/conta";
import { enderecoDeQuemEnviou, podeEnviar } from "@/lib/desafio/servidor";
import { lerDadosDaFornecedora } from "@/lib/fornecedoras/conta";
import { usarConvite } from "@/lib/fornecedoras/convites";

export type EstadoConvite = { erro: string; valores: Record<string, string> } | undefined;

// Página pública, protegida pelo código do link (que só a fornecedora recebeu).
export async function terminarCadastro(_estado: EstadoConvite, dados: FormData): Promise<EstadoConvite> {
  const valores = Object.fromEntries(
    [...dados.entries()].filter((par): par is [string, string] => typeof par[1] === "string" && !/senha|confirmacao/.test(par[0])),
  );
  const codigo = dados.get("codigo");
  if (!codigoValido(codigo)) return { erro: "Este link não vale mais. Peça um novo à Salty.", valores };
  const lido = lerDadosDaFornecedora(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  const senha = lerNovaSenha({ senha: dados.get("senha"), confirmacao: dados.get("confirmacao") });
  if (!senha.ok) return { erro: senha.erro, valores };
  // Limite de tentativas: o e-mail pode ser de uma conta que já existe, e aí a senha é conferida.
  if (!podeEnviar(`convite:${enderecoDeQuemEnviou(await headers())}`)) {
    return { erro: "Muitas tentativas feitas deste aparelho. Tente de novo daqui a uma hora.", valores };
  }
  const r = await usarConvite(codigo, lido.dados, senha.dados);
  if (!r.ok) {
    const erro = {
      convite: "Este link já foi usado ou venceu. Peça um novo à Salty.",
      "email-de-outra-fornecedora": "Este e-mail já é de outra fornecedora. Use outro e-mail ou fale com a Salty.",
      "senha-da-conta":
        "Este e-mail já tem uma conta no site da Salty (de compras, por exemplo). Para usar o mesmo e-mail, digite a senha dessa conta. Se esqueceu, use outro e-mail ou fale com a Salty.",
    }[r.motivo];
    return { erro, valores };
  }
  await signIn("credentials", { email: r.email, senha: senha.dados, redirectTo: "/fornecedora" });
}
