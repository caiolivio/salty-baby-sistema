// Regras da venda (CLAUDE.md, "Cálculos" e "Pedido, reserva e pagamento").
// Repasse, desconto e lucro são calculados aqui e gravados em cada item, para
// que uma mudança futura de percentual não altere o histórico.

import { calcularRepasse } from "../calculos";
import { dividirDescontos, lerPlanoDeDesconto, type PecaComPreco, type PlanoDeDesconto, type QuemPaga } from "./descontos";

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
  codigo?: string;
  tipo: "consignada" | "loja";
  precoCentavos: number;
  /** Percentual da própria peça; vazio usa o padrão da fornecedora. */
  percentualRepasse: number | null;
  percentualPadraoFornecedora: number | null;
  custoCentavos: number | null;
};

export type DescontoPorConta = QuemPaga | "misto";

export type ItemCalculado = {
  pecaId: string;
  precoUnitarioCentavos: number;
  descontoCentavos: number;
  /** De quem é o desconto deste item (vazio: sem desconto). */
  descontoPorConta: DescontoPorConta | null;
  valorPagoCentavos: number;
  percentualRepasse: number | null;
  repasseCentavos: number;
  custoCentavos: number | null;
  lucroCentavos: number;
};

/**
 * Calcula cada item da venda. Os descontos (por peça e do carrinho) vêm de
 * `dividirDescontos`; o repasse depende de quem paga cada desconto:
 * - dividido: o repasse é calculado sobre o valor com esse desconto;
 * - loja: o desconto não mexe no repasse;
 * - fornecedora: o desconto inteiro sai do repasse (e não pode passar dele).
 * Peças da loja não têm repasse: o desconto sai só do lucro.
 */
export function calcularItens(
  pecas: readonly PecaParaVender[],
  plano: PlanoDeDesconto,
): { ok: true; itens: ItemCalculado[]; descontoCentavos: number } | { ok: false; erro: string } {
  const partes = dividirDescontos(pecas, plano);
  if (!partes.ok) return partes;
  const itens: ItemCalculado[] = [];
  for (const [i, peca] of pecas.entries()) {
    const p = partes.dados[i];
    const desconto = p.descontoPeca + p.descontoCarrinho;
    const porConta = new Set<QuemPaga>();
    if (p.descontoPeca > 0) porConta.add(peca.tipo === "loja" ? "loja" : p.quemPeca);
    if (p.descontoCarrinho > 0) porConta.add(peca.tipo === "loja" ? "loja" : p.quemCarrinho);
    const descontoPorConta: DescontoPorConta | null = porConta.size === 0 ? null : porConta.size > 1 ? "misto" : [...porConta][0];
    const base = {
      pecaId: peca.id,
      precoUnitarioCentavos: peca.precoCentavos,
      descontoCentavos: desconto,
      descontoPorConta,
      valorPagoCentavos: p.valorPago,
    };
    if (peca.tipo === "loja") {
      const custo = peca.custoCentavos ?? 0;
      itens.push({ ...base, percentualRepasse: null, repasseCentavos: 0, custoCentavos: peca.custoCentavos, lucroCentavos: p.valorPago - custo });
      continue;
    }
    const percentual = peca.percentualRepasse ?? peca.percentualPadraoFornecedora ?? 0;
    const daParte = (quem: QuemPaga) =>
      (p.quemPeca === quem ? p.descontoPeca : 0) + (p.quemCarrinho === quem ? p.descontoCarrinho : 0);
    const repasse = calcularRepasse(p.precoCentavos - daParte("dividido"), percentual) - daParte("fornecedora");
    if (repasse < 0) {
      return {
        ok: false,
        erro: `O desconto por conta da fornecedora na ${peca.codigo ? `peça ${peca.codigo}` : "peça"} passa do valor que ela receberia. Diminua o desconto ou divida com a loja.`,
      };
    }
    itens.push({
      ...base,
      percentualRepasse: percentual,
      repasseCentavos: repasse,
      custoCentavos: null,
      lucroCentavos: p.valorPago - repasse,
    });
  }
  return { ok: true, itens, descontoCentavos: itens.reduce((s, i) => s + i.descontoCentavos, 0) };
}

export type DadosConfirmacao = { forma: FormaPagamento; desconto: PlanoDeDesconto; destino: Destino };

/** Lê o formulário "Confirmar pagamento": forma, destino e os descontos (opcionais). */
export function lerConfirmacao(
  valores: Record<string, unknown>,
  pecas: readonly PecaComPreco[],
): { ok: true; dados: DadosConfirmacao } | { ok: false; erro: string } {
  const forma = FORMAS_PAGAMENTO.find((f) => f.valor === valores.forma)?.valor;
  if (!forma) return { ok: false, erro: "Escolha a forma de pagamento." };
  const destino = DESTINOS.find((d) => d.valor === valores.destino)?.valor ?? "vendida";
  const plano = lerPlanoDeDesconto(valores, pecas);
  if (!plano.ok) return plano;
  // Confere os limites (desconto maior que o preço ou que o total) já aqui.
  const partes = dividirDescontos(pecas, plano.dados);
  if (!partes.ok) return partes;
  return { ok: true, dados: { forma, desconto: plano.dados, destino } };
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
  valores: Record<string, unknown>,
  pecas: readonly PecaComPreco[],
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
  const lido = lerConfirmacao(valores, pecas);
  if (!lido.ok) return lido;
  return { ok: true, dados: { ...lido.dados, canal, grupo: grupo?.nome ?? null, grupoId: grupo?.id ?? null, data } };
}
