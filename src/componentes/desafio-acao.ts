"use server";

import { novoDesafio } from "@/lib/desafio/servidor";

/** Nova imagem do desafio, quando a pessoa não consegue ler a atual. */
export async function trocarDesafio() {
  return novoDesafio();
}
