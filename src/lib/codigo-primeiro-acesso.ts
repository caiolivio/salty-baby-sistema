import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Confere o código de primeiro acesso (segredo CODIGO_PRIMEIRO_ACESSO do GitHub)
 * sem revelar, pelo tempo de resposta, quantas letras estavam certas.
 */
export function codigoConfere(digitado: string, esperado: string | undefined): boolean {
  if (!esperado?.trim()) return false;
  const a = createHash("sha256").update(digitado.trim()).digest();
  const b = createHash("sha256").update(esperado.trim()).digest();
  return timingSafeEqual(a, b);
}
