"use server";

import { refresh } from "next/cache";
import { exigirAcesso } from "@/lib/acesso";
import { cancelarDevolucao, concluirDevolucao } from "@/lib/fornecedoras/area";

// Pedidos de devolução: a loja marca como devolvida quando entrega a peça, ou
// cancela (a peça volta como estava).

export async function marcarDevolvidas(dados: FormData): Promise<void> {
  await exigirAcesso("painel", "/painel/devolucoes");
  for (const id of dados.getAll("id").map(String)) await concluirDevolucao(id);
  refresh();
}

export async function cancelar(dados: FormData): Promise<void> {
  await exigirAcesso("painel", "/painel/devolucoes");
  await cancelarDevolucao(String(dados.get("id") ?? ""));
  refresh();
}
