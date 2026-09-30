// Regras da venda (CLAUDE.md, "Cálculos" e "Pedido, reserva e pagamento").
// Repasse, desconto e lucro são calculados aqui e gravados em cada item, para
// que uma mudança futura de percentual não altere o histórico.

import { calcularVenda, distribuirDesconto } from "../calculos";
import { lerReais } from "../importacao/notion";

export const FORMAS_PAGAMENTO = [
  { valor: "pix", nome: "Pix" },
  { valor: "cartao", nome: "Cartão" },
  { valor: "dinheiro", nome: "Dinheiro" },
  { valor: "credito_fornecedora", nome: "Crédito da fornecedora" },
] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]["valor"];

/** Depois de pago: entregar/enviar agora ou guardar na sacolinha da cliente. */
export const DESTINOS = [
  { valor: "vendida", nome: "Entregar ou enviar agora" },
  { valor: "na_sacolinha", nome: "Guardar na sacolinha" },
] as const;
export type Destino = (typeof DESTINOS)[number]["valor"];

export type PecaParaVender = {
  id: string;
  tipo: "consignada" | "loja";
  precoCentavos: number;
  /** Percentual da própria peça; vazio usa o padrão da fornecedora. */
  percentualRepasse: number | null;
  percentualPadraoFornecedora: number | null;
  custoCentavos: number | null;
};

export type ItemCalculado = {
  pecaId: string;
  precoUnitarioCentavos: number;
  descontoCentavos: number;
  valorPagoCentavos: number;
  percentualRepasse: number | null;
  repasseCentavos: number;
  custoCentavos: number | null;
  lucroCentavos: number;
};

/**
 * Calcula cada item da venda. O desconto do pedido é dividido entre as peças na
 * proporção do preço, e o repasse é calculado sobre o valor com desconto.
 */
export function calcularItens(pecas: PecaParaVender[], descontoCentavos: number): ItemCalculado[] {
  const pagos = distribuirDesconto(
    pecas.map((p) => p.precoCentavos),
    descontoCentavos,
  );
  return pecas.map((peca, i) => {
    const valorPago = pagos[i];
    if (peca.tipo === "consignada") {
      const percentual = peca.percentualRepasse ?? peca.percentualPadraoFornecedora ?? 0;
      const r = calcularVenda({ tipo: "consignada", valorPago, percentualRepasse: percentual });
      return {
        pecaId: peca.id,
        precoUnitarioCentavos: peca.precoCentavos,
        descontoCentavos: peca.precoCentavos - valorPago,
        valorPagoCentavos: valorPago,
        percentualRepasse: percentual,
        repasseCentavos: r.repasse,
        custoCentavos: null,
        lucroCentavos: r.lucro,
      };
    }
    const r = calcularVenda({ tipo: "loja", valorPago, custo: peca.custoCentavos ?? 0 });
    return {
      pecaId: peca.id,
      precoUnitarioCentavos: peca.precoCentavos,
      descontoCentavos: peca.precoCentavos - valorPago,
      valorPagoCentavos: valorPago,
      percentualRepasse: null,
      repasseCentavos: 0,
      custoCentavos: peca.custoCentavos,
      lucroCentavos: r.lucro,
    };
  });
}

export type DadosConfirmacao = { forma: FormaPagamento; descontoCentavos: number; destino: Destino };

/** Lê o formulário "Confirmar pagamento". O desconto é opcional (em reais). */
export function lerConfirmacao(
  valores: { forma?: unknown; desconto?: unknown; destino?: unknown },
  totalCentavos: number,
): { ok: true; dados: DadosConfirmacao } | { ok: false; erro: string } {
  const forma = FORMAS_PAGAMENTO.find((f) => f.valor === valores.forma)?.valor;
  if (!forma) return { ok: false, erro: "Escolha a forma de pagamento." };
  const destino = DESTINOS.find((d) => d.valor === valores.destino)?.valor ?? "vendida";
  const texto = typeof valores.desconto === "string" ? valores.desconto.trim() : "";
  let desconto: number;
  try {
    desconto = lerReais(texto);
  } catch {
    desconto = -1;
  }
  if (desconto < 0) {
    return { ok: false, erro: "O desconto precisa ser um valor em reais, como 5 ou 5,50." };
  }
  if (desconto > totalCentavos) return { ok: false, erro: "O desconto não pode ser maior que o total do pedido." };
  return { ok: true, dados: { forma, descontoCentavos: desconto, destino } };
}
