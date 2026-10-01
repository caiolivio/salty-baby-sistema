"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { fichaDaCliente } from "@/lib/clientes/contas";
import { podeAcessar } from "@/lib/permissoes";
import { COOKIE_GRUPO, lerCodigoGrupo } from "@/lib/grupos/regras";
import { fecharPedido, liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { COOKIE_CARRINHO, incluirNoCarrinho, lerCarrinho, lerNomeCliente, lerTelefoneCliente, tirarDoCarrinho } from "@/lib/pedidos/regras";

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

export type EstadoFechar = { erro?: string; nome?: string; telefone?: string } | undefined;

export async function fechar(_anterior: EstadoFechar, dados: FormData): Promise<EstadoFechar> {
  const digitado = { nome: String(dados.get("nome") ?? ""), telefone: String(dados.get("telefone") ?? "") };
  const nome = lerNomeCliente(dados.get("nome"));
  if (!nome) return { erro: "Escreva seu nome para a loja saber de quem é o pedido.", ...digitado };
  const telefone = lerTelefoneCliente(dados.get("telefone"));
  if (!telefone) return { erro: "Escreva seu WhatsApp com DDD, por exemplo (12) 98105-3623.", ...digitado };
  const ids = await carrinhoAtual();
  if (ids.length === 0) return { erro: "Seu carrinho está vazio.", ...digitado };

  await liberarReservasVencidas();
  // Grupo de WhatsApp de onde a cliente veio (guardado pelo link do post).
  const guardado = lerCodigoGrupo((await cookies()).get(COOKIE_GRUPO)?.value);
  const grupo = guardado ? await prisma.grupoWhatsapp.findUnique({ where: { codigo: guardado }, select: { id: true } }) : null;
  const usuario = await usuarioAtual();
  const ficha = usuario && podeAcessar(usuario.perfis, "area-cliente") ? await fichaDaCliente(usuario) : null;
  const resultado = await fecharPedido(ids, { nome, telefone, clienteId: ficha?.id }, grupo?.id ?? null);
  if (!resultado.ok) {
    return {
      erro: "Algumas peças acabaram de sair e foram marcadas abaixo. Tire-as do carrinho e feche o pedido de novo.",
      ...digitado,
    };
  }
  await gravarCarrinho([]);
  (await cookies()).delete(COOKIE_GRUPO);
  redirect(`/pedido/${resultado.id}?novo=1`);
}
