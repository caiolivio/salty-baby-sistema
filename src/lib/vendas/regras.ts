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
  if (desconto > totalCentavos) return { ok: false, erro: "O desconto não pode ser maior que o total." };
  return { ok: true, dados: { forma, descontoCentavos: desconto, destino } };
}

// Venda direta no painel (WhatsApp, grupos, Instagram, loja e Bag).

/** Canais de uma venda registrada direto no painel (o site usa o pedido). */
export const CANAIS_DIRETOS = [
  { valor: "whatsapp_privado", nome: "WhatsApp (conversa privada)" },
  { valor: "grupo_whatsapp", nome: "Grupo de WhatsApp" },
  { valor: "instagram", nome: "Instagram" },
  { valor: "loja", nome: "Loja" },
  { valor: "bag", nome: "Bag" },
] as const;
export type CanalDireto = (typeof CANAIS_DIRETOS)[number]["valor"];

export type DadosVendaDireta = DadosConfirmacao & {
  canal: CanalDireto;
  /** Nome do grupo no dia da venda e o grupo do cadastro (tabela grupos_whatsapp). */
  grupo: string | null;
  grupoId: string | null;
  data: string;
};

/**
 * Lê o formulário da venda direta. O grupo vem pelo id, entre os grupos em uso. A data vem do campo de data (aaaa-mm-dd),
 * vazia vira hoje e não pode ser no futuro.
 */
export function lerVendaDireta(
  valores: { canal?: unknown; grupo?: unknown; forma?: unknown; desconto?: unknown; destino?: unknown; data?: unknown },
  totalCentavos: number,
  hoje: string,
  grupos: { id: string; nome: string }[],
): { ok: true; dados: DadosVendaDireta } | { ok: false; erro: string } {
  const canal = CANAIS_DIRETOS.find((c) => c.valor === valores.canal)?.valor;
  if (!canal) return { ok: false, erro: "Escolha o canal da venda." };
  const grupo = canal === "grupo_whatsapp" ? grupos.find((g) => g.id === valores.grupo) : null;
  if (grupo === undefined) return { ok: false, erro: "Escolha o grupo de WhatsApp." };
  const data = typeof valores.data === "string" && valores.data.trim() ? valores.data.trim() : hoje;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(`${data}T00:00:00Z`))) {
    return { ok: false, erro: "A data da venda não é válida." };
  }
  if (data > hoje) return { ok: false, erro: "A data da venda não pode ser no futuro." };
  const lido = lerConfirmacao(valores, totalCentavos);
  if (!lido.ok) return lido;
  return { ok: true, dados: { ...lido.dados, canal, grupo: grupo?.nome ?? null, grupoId: grupo?.id ?? null, data } };
}
