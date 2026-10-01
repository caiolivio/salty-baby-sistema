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
