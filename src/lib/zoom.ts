// Contas do zoom da foto (galeria da peça no site). Funções puras, testadas.

export const ZOOM_MAXIMO = 4;
export const ZOOM_DO_TOQUE_DUPLO = 2.5;

export type Enquadramento = { escala: number; x: number; y: number };
export const SEM_ZOOM: Enquadramento = { escala: 1, x: 0, y: 0 };

/** Mantém a foto ampliada cobrindo a área: não deixa arrastar para fora da borda. */
export function limitar(e: Enquadramento, largura: number, altura: number): Enquadramento {
  const escala = Math.min(ZOOM_MAXIMO, Math.max(1, e.escala));
  if (escala === 1) return SEM_ZOOM;
  const maxX = ((escala - 1) * largura) / 2;
  const maxY = ((escala - 1) * altura) / 2;
  return { escala, x: Math.min(maxX, Math.max(-maxX, e.x)), y: Math.min(maxY, Math.max(-maxY, e.y)) };
}

/**
 * Amplia (ou reduz) mantendo parado o ponto tocado. `px`, `py`: o ponto em
 * relação ao centro da área.
 */
export function ampliarEm(e: Enquadramento, novaEscala: number, px: number, py: number, largura: number, altura: number) {
  const escala = Math.min(ZOOM_MAXIMO, Math.max(1, novaEscala));
  const fator = escala / e.escala;
  return limitar({ escala, x: px - (px - e.x) * fator, y: py - (py - e.y) * fator }, largura, altura);
}

/** Toque duplo: amplia no ponto tocado, ou volta ao normal se já estava ampliada. */
export function toqueDuplo(e: Enquadramento, px: number, py: number, largura: number, altura: number) {
  return e.escala > 1 ? SEM_ZOOM : ampliarEm(e, ZOOM_DO_TOQUE_DUPLO, px, py, largura, altura);
}

/** Lupa do computador: origem do zoom (em %) pela posição do mouse sobre a foto. */
export function origemDaLupa(mx: number, my: number, largura: number, altura: number) {
  const pct = (v: number, t: number) => Math.round(Math.min(100, Math.max(0, (v / t) * 100)));
  return `${pct(mx, largura)}% ${pct(my, altura)}%`;
}
