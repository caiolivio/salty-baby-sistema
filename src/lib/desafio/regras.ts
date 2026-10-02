// Desafio contra robôs ("digite as letras da imagem"), feito no próprio site,
// sem serviço de terceiros. Aqui ficam as regras puras, testadas: o texto, a
// assinatura do desafio e a conferência da resposta.

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Letras e números fáceis de ler: sem 0/O, 1/I/L, 2/Z, 5/S, 8/B. */
export const ALFABETO = "ACEFHKMNPRTUVWXY347";
export const TAMANHO_DESAFIO = 5;
/** Quanto tempo a imagem vale. */
export const VALIDADE_MS = 15 * 60 * 1000;
/** Gente de verdade leva alguns segundos para preencher; robô envia na hora. */
export const TEMPO_MINIMO_MS = 3000;

export function gerarTexto(sortear: (maximo: number) => number = randomInt): string {
  return Array.from({ length: TAMANHO_DESAFIO }, () => ALFABETO[sortear(ALFABETO.length)]).join("");
}

/** Aceita a resposta em minúsculas e com espaços. */
export function normalizarResposta(resposta: unknown): string {
  return typeof resposta === "string" ? resposta.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

const base64url = (texto: string) => Buffer.from(texto).toString("base64url");
const assinatura = (segredo: string, dados: string, resposta: string) =>
  createHmac("sha256", segredo).update(`${dados}|${resposta}`).digest("base64url");

/**
 * Ficha do desafio que vai escondida no formulário: um número único e a hora,
 * assinados junto com a resposta certa. A resposta em si não vai na ficha.
 */
export function assinarDesafio(texto: string, segredo: string, agora = Date.now()): string {
  const dados = base64url(JSON.stringify({ n: randomBytes(9).toString("base64url"), t: agora }));
  return `${dados}.${assinatura(segredo, dados, texto)}`;
}

export type Conferencia = { ok: true; numero: string } | { ok: false; motivo: "errado" | "vencido" | "rapido" };

export function conferirDesafio(ficha: unknown, resposta: unknown, segredo: string, agora = Date.now()): Conferencia {
  if (typeof ficha !== "string" || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ficha)) return { ok: false, motivo: "errado" };
  const [dados, assinado] = ficha.split(".");
  let conteudo: { n?: unknown; t?: unknown };
  try {
    conteudo = JSON.parse(Buffer.from(dados, "base64url").toString());
  } catch {
    return { ok: false, motivo: "errado" };
  }
  if (typeof conteudo.n !== "string" || typeof conteudo.t !== "number") return { ok: false, motivo: "errado" };
  const esperado = Buffer.from(assinatura(segredo, dados, normalizarResposta(resposta)));
  const recebido = Buffer.from(assinado);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return { ok: false, motivo: "errado" };
  if (agora - conteudo.t > VALIDADE_MS) return { ok: false, motivo: "vencido" };
  if (agora - conteudo.t < TEMPO_MINIMO_MS) return { ok: false, motivo: "rapido" };
  return { ok: true, numero: conteudo.n };
}

/** Desenho de cada símbolo, em traços numa grade de 8 × 12 (sem depender de fontes no servidor). */
export const TRACOS: Record<string, string> = {
  A: "M0 12L4 0L8 12M1.5 7.5H6.5",
  C: "M8 1.5Q4 -1.5 1 2.5Q-0.5 6 1 9.5Q4 13.5 8 10.5",
  E: "M8 0H0V12H8M0 6H6",
  F: "M8 0H0V12M0 6H6",
  H: "M0 0V12M8 0V12M0 6H8",
  K: "M0 0V12M8 0L0 7M3 4.5L8 12",
  M: "M0 12V0L4 7L8 0V12",
  N: "M0 12V0L8 12V0",
  P: "M0 12V0H5Q8.5 0 8.5 3Q8.5 6 5 6H0",
  R: "M0 12V0H5Q8.5 0 8.5 3Q8.5 6 5 6H0M4 6L8 12",
  T: "M0 0H8M4 0V12",
  U: "M0 0V8.5Q0 12 4 12Q8 12 8 8.5V0",
  V: "M0 0L4 12L8 0",
  W: "M0 0L2 12L4 5L6 12L8 0",
  X: "M0 0L8 12M8 0L0 12",
  Y: "M0 0L4 6L8 0M4 6V12",
  "3": "M0 1Q4 -1.5 7 1.5Q8.5 5 4 6Q9 7 7.5 10.5Q4 13.5 0 11",
  "4": "M6 12V0L0 8H8.5",
  "7": "M0 0H8L3 12",
};

/**
 * Desenho (SVG) do texto, torto e com riscos por cima, para dificultar a
 * leitura por programas. `sortear` devolve um número de 0 a 1.
 */
export function desenharDesafio(texto: string, sortear: () => number = Math.random): string {
  const largura = 220;
  const altura = 80;
  const entre = (a: number, b: number) => a + (b - a) * sortear();
  const cores = ["#13506E", "#13212B", "#1d6b8f", "#0f3d54"];
  const letras = [...texto]
    .map((letra, i) => {
      const x = 22 + i * 38 + entre(-4, 4);
      const y = 18 + entre(-6, 6);
      const escala = entre(3.4, 4);
      const giro = entre(-22, 22);
      const cor = cores[Math.floor(entre(0, cores.length))];
      return `<path d="${TRACOS[letra]}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${giro.toFixed(1)} 4 6) scale(${escala.toFixed(2)})" stroke="${cor}" stroke-width="${(3.4 / escala).toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  const riscos = Array.from({ length: 5 }, () => {
    const pontos = [entre(0, 30), entre(10, 70), entre(60, 110), entre(0, 80), entre(110, 160), entre(0, 80), entre(190, 220), entre(10, 70)];
    return `<path d="M${pontos[0].toFixed(0)} ${pontos[1].toFixed(0)}C${pontos.slice(2).map((p) => p.toFixed(0)).join(" ")}" stroke="#32AFB5" stroke-width="${entre(1.2, 2.2).toFixed(1)}" fill="none" opacity="0.8"/>`;
  }).join("");
  const pontos = Array.from(
    { length: 70 },
    () => `<circle cx="${entre(0, largura).toFixed(0)}" cy="${entre(0, altura).toFixed(0)}" r="${entre(0.6, 1.6).toFixed(1)}" fill="#13506E" opacity="0.5"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}"><rect width="100%" height="100%" fill="#eef7f8"/>${pontos}${letras}${riscos}</svg>`;
}
