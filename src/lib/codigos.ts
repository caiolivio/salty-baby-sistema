// Formatos de código (CLAUDE.md, "Códigos").

export const PREFIXO_LOJA = "SB";

/** F01 … F99, F100 … */
export function codigoFornecedora(numero: number): string {
  if (!Number.isInteger(numero) || numero < 1) throw new Error(`número de fornecedora inválido: ${numero}`);
  return `F${String(numero).padStart(2, "0")}`;
}

/** F48-00001, SB-00012 */
export function codigoPeca(prefixo: string, numero: number): string {
  if (!Number.isInteger(numero) || numero < 1 || numero > 99_999) throw new Error(`número de peça inválido: ${numero}`);
  return `${prefixo}-${String(numero).padStart(5, "0")}`;
}

export function chaveSequenciaPeca(prefixo: string): string {
  return `peca:${prefixo}`;
}

export const CHAVE_SEQUENCIA_FORNECEDORA = "fornecedora";

/**
 * Próximo número de uma sequência (fornecedora ou peças de uma fornecedora). A
 * sequência só cresce, então um código nunca volta a ser usado; e nunca fica
 * abaixo de um número que já existe.
 */
export function numeroSeguro(ultimoDaSequencia: number, maiorExistente: number | null): number {
  return Math.max(ultimoDaSequencia, (maiorExistente ?? 0) + 1);
}
