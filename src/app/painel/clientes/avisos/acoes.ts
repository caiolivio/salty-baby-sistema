"use server";

import { refresh } from "next/cache";
import { exigirPagina } from "@/lib/acesso";
import { marcarAvisadas } from "@/lib/alertas/servidor";
import { marcarFilaAvisada } from "@/lib/fila/servidor";

/** "Enviar no WhatsApp" ou "Copiar texto": as peças da mensagem não entram no próximo aviso. */
export async function avisoMandado(clienteId: string, pecaIds: string[]) {
  await exigirPagina("clientes", "alterar");
  await marcarAvisadas(clienteId, pecaIds.slice(0, 200));
  refresh();
}

/** Aviso da fila de espera mandado: a cliente sai da lista "enviar hoje" desta peça. */
export async function filaAvisada(entradaId: string) {
  await exigirPagina("clientes", "alterar");
  await marcarFilaAvisada(entradaId);
  refresh();
}
