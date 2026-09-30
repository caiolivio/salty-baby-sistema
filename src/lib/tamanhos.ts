// Tamanhos na ordem usada para filtrar a vitrine e sugerir o próximo tamanho
// (CLAUDE.md, "Peça"). Prematuro é um tamanho próprio, antes do RN.
export const TAMANHOS = [
  { valor: "Prematuro", nome: "Prematuro" },
  { valor: "RN", nome: "RN (0 a 3 meses)" },
  { valor: "P", nome: "P (3 a 6 meses)" },
  { valor: "M", nome: "M (6 a 9 meses)" },
  { valor: "G", nome: "G (9 meses a 1 ano)" },
  { valor: "1 ano", nome: "1 ano" },
  { valor: "18 meses", nome: "18 meses" },
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18].map((anos) => ({ valor: `${anos} anos`, nome: `${anos} anos` })),
] as const;

export type Tamanho = (typeof TAMANHOS)[number]["valor"];

export function ordemDoTamanho(tamanho: string): number {
  return TAMANHOS.findIndex((t) => t.valor === tamanho);
}

/** Reconhece o tamanho escrito de jeitos diferentes ("Rn", "prematuro", "2 anos", "2"). */
export function lerTamanho(texto: string): Tamanho | undefined {
  const limpo = texto.trim().toLowerCase().replace(/\s+/g, " ");
  if (!limpo) return undefined;
  const direto = TAMANHOS.find((t) => t.valor.toLowerCase() === limpo);
  if (direto) return direto.valor;
  if (limpo === "1" || limpo === "1 anos") return "1 ano";
  if (limpo === "18 m" || limpo === "18m") return "18 meses";
  const anos = /^(\d+)( ?anos?| ?a)?$/.exec(limpo);
  if (anos) return TAMANHOS.find((t) => t.valor === `${anos[1]} anos`)?.valor;
  return undefined;
}
