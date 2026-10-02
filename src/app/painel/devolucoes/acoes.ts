"use server";

import { refresh } from "next/cache";
import { exigirPagina } from "@/lib/acesso";
import { cancelarDevolucao, concluirDevolucao } from "@/lib/fornecedoras/area";
import { autorDe } from "@/lib/historico/regras";

// Pedidos de devolução: a loja marca como devolvida quando entrega a peça, ou
// cancela (a peça volta como estava).

export async function marcarDevolvidas(dados: FormData): Promise<void> {
  const usuario = await exigirPagina("devolucoes", "alterar", "/painel/devolucoes");
  for (const id of dados.getAll("id").map(String)) await concluirDevolucao(id, autorDe(usuario));
  refresh();
}

export async function cancelar(dados: FormData): Promise<void> {
  const usuario = await exigirPagina("devolucoes", "alterar", "/painel/devolucoes");
  await cancelarDevolucao(String(dados.get("id") ?? ""), autorDe(usuario));
  refresh();
}
