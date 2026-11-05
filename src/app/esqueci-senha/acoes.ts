"use server";

import { lerEmailDoPedido } from "@/lib/contas/esqueci-senha";
import { mandarLinkDeNovaSenha } from "@/lib/contas/esqueci-senha-servidor";
import { conferirEnvioHumano, novoDesafio, type Desafio } from "@/lib/desafio/servidor";

export type EstadoEsqueci = { erro?: string; enviado?: string; email?: string; desafio?: Desafio } | undefined;

// Pública: qualquer pessoa pode pedir o link; ele só vai para o e-mail da conta.
export async function pedirNovaSenha(_estado: EstadoEsqueci, dados: FormData): Promise<EstadoEsqueci> {
  const digitado = String(dados.get("email") ?? "");
  const email = lerEmailDoPedido(digitado);
  if (!email) return { erro: "Confira o e-mail: ele precisa ser como nome@exemplo.com.br.", email: digitado, desafio: await novoDesafio() };
  const robo = await conferirEnvioHumano(dados);
  if (robo) return { erro: robo, email: digitado, desafio: await novoDesafio() };
  const ok = await mandarLinkDeNovaSenha(email);
  if (!ok) {
    return {
      erro: "Não conseguimos mandar o e-mail agora. Tente de novo daqui a pouco ou peça um link novo à loja no WhatsApp.",
      email: digitado,
      desafio: await novoDesafio(),
    };
  }
  return { enviado: email };
}
