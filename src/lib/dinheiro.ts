// Valores em dinheiro são sempre centavos inteiros (ver CLAUDE.md, "Stack").

const formatoReais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function garantirCentavos(valor: number, campo = "valor"): number {
  if (!Number.isSafeInteger(valor)) {
    throw new Error(`${campo} precisa ser um número inteiro de centavos (recebido: ${valor})`);
  }
  return valor;
}

/** 123456 → "R$ 1.234,56" (o espaço é o não separável do padrão pt-BR). */
export function formatarReais(centavos: number): string {
  garantirCentavos(centavos);
  return formatoReais.format(centavos / 100);
}
