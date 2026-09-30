// Regras de "Cálculos" do CLAUDE.md. Todos os valores são centavos inteiros e
// percentuais são pontos-base (4000 = 40%), para nunca usar float em dinheiro.

import { garantirCentavos } from "./dinheiro";

export const CEM_POR_CENTO = 10_000;

function garantirPercentual(pontosBase: number): number {
  if (!Number.isInteger(pontosBase) || pontosBase < 0 || pontosBase > CEM_POR_CENTO) {
    throw new Error(`percentual inválido: ${pontosBase} (use pontos-base, de 0 a 10000)`);
  }
  return pontosBase;
}

/** Arredonda meio centavo para cima, como na calculadora. */
function aplicarPercentual(centavos: number, pontosBase: number): number {
  return Math.floor((centavos * pontosBase + CEM_POR_CENTO / 2) / CEM_POR_CENTO);
}

/** Repasse da fornecedora: calculado sobre o valor pago, já com desconto. */
export function calcularRepasse(valorPago: number, percentualRepasse: number): number {
  garantirCentavos(valorPago, "valor pago");
  garantirPercentual(percentualRepasse);
  if (valorPago < 0) throw new Error("o valor pago não pode ser negativo");
  return aplicarPercentual(valorPago, percentualRepasse);
}

export type PecaVendida =
  | { tipo: "consignada"; valorPago: number; percentualRepasse: number }
  | { tipo: "loja"; valorPago: number; custo: number };

export type ResultadoVenda = { valorPago: number; repasse: number; lucro: number };

/** Repasse e lucro de uma peça vendida. O resultado é gravado no item da venda. */
export function calcularVenda(peca: PecaVendida): ResultadoVenda {
  if (peca.tipo === "consignada") {
    const repasse = calcularRepasse(peca.valorPago, peca.percentualRepasse);
    return { valorPago: peca.valorPago, repasse, lucro: peca.valorPago - repasse };
  }
  garantirCentavos(peca.valorPago, "valor pago");
  garantirCentavos(peca.custo, "custo");
  if (peca.valorPago < 0) throw new Error("o valor pago não pode ser negativo");
  return { valorPago: peca.valorPago, repasse: 0, lucro: peca.valorPago - peca.custo };
}

/**
 * Distribui um desconto sobre o total do pedido entre as peças, na proporção do
 * preço de cada uma. Os centavos que sobram do arredondamento vão para as peças
 * com a maior fração, então a soma dos descontos é sempre exatamente o desconto.
 * Devolve o valor pago de cada peça, na mesma ordem.
 */
export function distribuirDesconto(precos: number[], desconto: number): number[] {
  precos.forEach((p, i) => {
    garantirCentavos(p, `preço da peça ${i + 1}`);
    if (p < 0) throw new Error("preço não pode ser negativo");
  });
  garantirCentavos(desconto, "desconto");
  const total = precos.reduce((a, b) => a + b, 0);
  if (desconto < 0) throw new Error("o desconto não pode ser negativo");
  if (desconto > total) throw new Error("o desconto não pode ser maior que o total do pedido");
  if (desconto === 0 || total === 0) return [...precos];

  const partes = precos.map((preco, indice) => {
    const exato = preco * desconto;
    return { indice, base: Math.floor(exato / total), resto: exato % total };
  });
  let sobra = desconto - partes.reduce((a, p) => a + p.base, 0);
  [...partes]
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice)
    .forEach((p) => {
      if (sobra > 0) {
        p.base += 1;
        sobra -= 1;
      }
    });
  return partes.map((p) => precos[p.indice] - p.base);
}
