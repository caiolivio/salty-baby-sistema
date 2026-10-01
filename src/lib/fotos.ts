import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// As fotos ficam numa pasta da VPS, fora do código (FOTOS_DIR), para não se
// perderem a cada publicação. Cada foto é guardada em dois tamanhos.
export const TAMANHO_GRANDE = 1600;
export const TAMANHO_MINIATURA = 400;

export function pastaDeFotos(): string {
  // A pasta vem do ambiente: o turbopackIgnore evita que o build copie o projeto inteiro.
  return path.resolve(/*turbopackIgnore: true*/ process.env.FOTOS_DIR ?? path.join(process.cwd(), "dados", "fotos"));
}

/** Reduz a foto e grava. Devolve o nome base usado no banco (sem extensão). */
export async function guardarFotoDePeca(pecaId: string, conteudo: Buffer): Promise<string> {
  return guardarFotoEm(`pecas/${pecaId}`, conteudo);
}

/** Foto de uma peça proposta por quem quer ser fornecedora. */
export async function guardarFotoDeProposta(conteudo: Buffer): Promise<string> {
  return guardarFotoEm(`propostas/${new Date().toISOString().slice(0, 7)}`, conteudo);
}

/** Lê uma foto já guardada (o tamanho grande), para copiar para outra peça. */
export async function lerFotoGuardada(base: string): Promise<Buffer | null> {
  return lerArquivoDeFoto([`${base}.webp`]);
}

async function guardarFotoEm(pasta: string, conteudo: Buffer): Promise<string> {
  const base = `${pasta}/${randomUUID()}`;
  const destino = path.join(pastaDeFotos(), base);
  await mkdir(path.dirname(destino), { recursive: true });
  const imagem = sharp(conteudo, { failOn: "error" }).rotate(); // respeita a orientação do celular
  const [grande, miniatura] = await Promise.all([
    imagem.clone().resize(TAMANHO_GRANDE, TAMANHO_GRANDE, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    imagem.clone().resize(TAMANHO_MINIATURA, TAMANHO_MINIATURA, { fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toBuffer(),
  ]);
  await Promise.all([writeFile(`${destino}.webp`, grande), writeFile(`${destino}-p.webp`, miniatura)]);
  return base;
}

/** Endereço público da foto. */
export function enderecoDaFoto(base: string, miniatura = false): string {
  return `/fotos/${base}${miniatura ? "-p" : ""}.webp`;
}

/** Lê um arquivo da pasta de fotos, sem deixar escapar para fora dela. */
export async function lerArquivoDeFoto(partes: string[]): Promise<Buffer | null> {
  const raiz = pastaDeFotos();
  const alvo = path.resolve(raiz, ...partes);
  if (!alvo.startsWith(raiz + path.sep) || !alvo.endsWith(".webp")) return null;
  try {
    return await readFile(alvo);
  } catch {
    return null;
  }
}

export async function apagarFotosDePecas(): Promise<void> {
  await rm(path.join(pastaDeFotos(), "pecas"), { recursive: true, force: true });
}

/** Apaga os dois tamanhos de uma foto. */
export async function apagarFoto(base: string): Promise<void> {
  const raiz = pastaDeFotos();
  const alvo = path.resolve(raiz, base);
  if (!alvo.startsWith(raiz + path.sep)) return;
  await Promise.all([rm(`${alvo}.webp`, { force: true }), rm(`${alvo}-p.webp`, { force: true })]);
}
