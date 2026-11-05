"use client";

// Guarda rascunhos de formulário no próprio aparelho (IndexedDB), com as fotos.
// Se o navegador não deixar (aba anônima, espaço cheio), tudo segue sem rascunho.

import type { CamposDoRascunho } from "@/lib/pecas/rascunho";

export type FotoDoRascunho = { nome: string; tipo: string; dados: Blob };
export type Rascunho = { campos: CamposDoRascunho; fotos: FotoDoRascunho[]; salvoEm: number };

const BANCO = "salty-rascunhos";
const LOJA = "rascunhos";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA);
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => falha(pedido.error);
  });
}

async function usar<T>(modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const banco = await abrir();
    return await new Promise<T>((ok, falha) => {
      const pedido = fazer(banco.transaction(LOJA, modo).objectStore(LOJA));
      pedido.onsuccess = () => ok(pedido.result);
      pedido.onerror = () => falha(pedido.error);
    }).finally(() => banco.close());
  } catch {
    return undefined;
  }
}

export const lerRascunho = (chave: string) => usar<Rascunho | undefined>("readonly", (l) => l.get(chave));
export const gravarRascunho = (chave: string, r: Rascunho) => usar("readwrite", (l) => l.put(r, chave));
export const apagarRascunho = (chave: string) => usar("readwrite", (l) => l.delete(chave));
