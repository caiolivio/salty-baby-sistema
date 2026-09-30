"use server";

import { revalidatePath } from "next/cache";
import { exigirAcesso } from "@/lib/acesso";
import { encerrarPedido } from "@/lib/pedidos/gravar";

/** Cancela um pedido reservado: as peças voltam na hora para a vitrine. */
export async function cancelarPedido(dados: FormData): Promise<void> {
  await exigirAcesso("painel");
  await encerrarPedido(String(dados.get("id") ?? ""), "cancelado");
  revalidatePath("/painel/pedidos");
}
