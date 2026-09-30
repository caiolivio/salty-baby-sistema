"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fecharPedido, liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { COOKIE_CARRINHO, incluirNoCarrinho, lerCarrinho, lerNomeCliente, tirarDoCarrinho } from "@/lib/pedidos/regras";

// Ações públicas da loja (não pedem login). O carrinho fica num cookie da
// própria cliente; o banco só é alterado ao fechar o pedido.

async function carrinhoAtual(): Promise<string[]> {
  return lerCarrinho((await cookies()).get(COOKIE_CARRINHO)?.value);
}

async function gravarCarrinho(ids: string[]) {
  (await cookies()).set(COOKIE_CARRINHO, ids.join(","), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function incluir(dados: FormData) {
  const id = String(dados.get("id") ?? "");
  await gravarCarrinho(incluirNoCarrinho(await carrinhoAtual(), id));
  const voltar = String(dados.get("voltar") ?? "");
  if (voltar.startsWith("/peca/")) redirect(voltar);
}

export async function tirar(dados: FormData) {
  await gravarCarrinho(tirarDoCarrinho(await carrinhoAtual(), String(dados.get("id") ?? "")));
}

export type EstadoFechar = { erro?: string; nome?: string } | undefined;

export async function fechar(_anterior: EstadoFechar, dados: FormData): Promise<EstadoFechar> {
  const nome = lerNomeCliente(dados.get("nome"));
  if (!nome)
    return {
      erro: "Escreva seu nome para a loja saber de quem é o pedido.",
      nome: String(dados.get("nome") ?? ""),
    };
  const ids = await carrinhoAtual();
  if (ids.length === 0) return { erro: "Seu carrinho está vazio.", nome };

  await liberarReservasVencidas();
  const resultado = await fecharPedido(ids, nome);
  if (!resultado.ok) {
    return {
      erro: "Algumas peças acabaram de sair e foram marcadas abaixo. Tire-as do carrinho e feche o pedido de novo.",
      nome,
    };
  }
  await gravarCarrinho([]);
  redirect(`/pedido/${resultado.id}?novo=1`);
}
