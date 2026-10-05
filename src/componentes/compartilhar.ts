"use client";

import { useSyncExternalStore } from "react";

// Ajudas para mandar posts ao WhatsApp pelo compartilhamento do celular.

const nadaMuda = () => () => {};

/** Se o navegador sabe compartilhar (celular). No servidor é sempre não. */
export function usePodeCompartilhar(): boolean {
  return useSyncExternalStore(
    nadaMuda,
    () => typeof navigator.share === "function",
    () => false,
  );
}

/** Converte a foto para JPEG, porque o WhatsApp trata imagens WebP como figurinha. */
export async function emJpeg(imagem: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(imagem);
  const tela = document.createElement("canvas");
  tela.width = bitmap.width;
  tela.height = bitmap.height;
  const pincel = tela.getContext("2d");
  if (!pincel) throw new Error("sem canvas");
  pincel.fillStyle = "#fff";
  pincel.fillRect(0, 0, tela.width, tela.height);
  pincel.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) =>
    tela.toBlob((b) => (b ? resolve(b) : reject(new Error("sem jpeg"))), "image/jpeg", 0.9),
  );
}

/** Busca a foto do site e devolve o arquivo JPEG pronto para compartilhar. */
export async function fotoEmJpeg(url: string, nome: string): Promise<File> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("foto não abriu");
  return new File([await emJpeg(await resposta.blob())], nome, { type: "image/jpeg" });
}

/** Baixa um arquivo no computador ou no celular. */
export function baixarArquivo(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = arquivo.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * O Android só deixa compartilhar até 10 arquivos de uma vez; com mais, o
 * compartilhamento falha sem abrir nada.
 */
export const MAXIMO_DE_FOTOS_POR_VEZ = 10;

/** Divide as fotos em levas que o celular aceita compartilhar. */
export function emLevas<T>(itens: T[], tamanho = MAXIMO_DE_FOTOS_POR_VEZ): T[][] {
  const levas: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) levas.push(itens.slice(i, i + tamanho));
  return levas;
}

/** Link que abre o WhatsApp com o texto pronto, para escolher o grupo ou a conversa. */
export const linkDoWhatsApp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

export type ResultadoDoCompartilhar = "ok" | "cancelado" | "erro";

/**
 * Abre o compartilhamento do celular com as fotos (se o celular aceitar) e o
 * texto. O compartilhamento é chamado antes de qualquer espera: o celular só
 * abre logo depois do toque, e esperar algo antes (como copiar o texto) faz
 * ele recusar. O texto é copiado em seguida, caso o WhatsApp mostre só as fotos.
 */
export async function compartilharNoCelular(texto: string, fotos: File[]): Promise<ResultadoDoCompartilhar> {
  const comTexto = texto ? { text: texto } : {};
  const comFotos = fotos.length > 0 && navigator.canShare?.({ files: fotos, ...comTexto }) === true;
  let pedido: Promise<void>;
  try {
    pedido = navigator.share(comFotos ? { files: fotos, ...comTexto } : comTexto);
  } catch {
    return "erro";
  }
  if (texto) navigator.clipboard?.writeText(texto).catch(() => {});
  try {
    await pedido;
    return "ok";
  } catch (erro) {
    return erro instanceof DOMException && erro.name === "AbortError" ? "cancelado" : "erro";
  }
}
