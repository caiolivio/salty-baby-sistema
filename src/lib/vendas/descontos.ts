// Descontos dados na hora da venda (o pagamento acontece fora do site, e o
// valor combinado com a cliente pode ser diferente do carrinho). Funções puras,
// usadas no servidor e na prévia da tela, para os números baterem nos dois.
//
// - Desconto por peça (R$ ou %), aplicado primeiro, só naquela peça.
// - Desconto no carrinho (R$, % ou "valor que a cliente pagou"), dividido entre
//   as peças na proporção do valor de cada uma depois do desconto da peça.
// - Quem paga cada desconto: dividido (o repasse é calculado sobre o valor com
//   desconto), por conta da loja (repasse sobre o preço cheio) ou por conta da
//   fornecedora (ela recebe o repasse cheio menos o desconto inteiro).

import { distribuirDesconto } from "../calculos";
import { formatarReais } from "../dinheiro";
import { lerPercentual, lerReais } from "../importacao/notion";

export const QUEM_PAGA = [
  { valor: "dividido", nome: "Dividido com a fornecedora" },
  { valor: "loja", nome: "Por conta da loja" },
  { valor: "fornecedora", nome: "Por conta da fornecedora" },
] as const;
export type QuemPaga = (typeof QUEM_PAGA)[number]["valor"];

export const MODOS_CARRINHO = [
  { valor: "reais", nome: "Em R$" },
  { valor: "percentual", nome: "Em %" },
  { valor: "valor_pago", nome: "Valor que a cliente pagou" },
] as const;
export type ModoCarrinho = (typeof MODOS_CARRINHO)[number]["valor"];

/** valor: centavos (reais) ou pontos-base (percentual, 1000 = 10%). */
export type DescontoDaPeca = { tipo: "reais" | "percentual"; valor: number; quem: QuemPaga };
/** valor: centavos (reais e valor pago) ou pontos-base (percentual). */
export type DescontoDoCarrinho = { modo: ModoCarrinho; valor: number; quem: QuemPaga };

export type PlanoDeDesconto = {
  carrinho: DescontoDoCarrinho | null;
  porPeca: Record<string, DescontoDaPeca>;
  motivo: string | null;
};

export const SEM_DESCONTO: PlanoDeDesconto = { carrinho: null, porPeca: {}, motivo: null };

export type PecaComPreco = { id: string; codigo?: string; precoCentavos: number };

export type PartesDoDesconto = {
  pecaId: string;
  precoCentavos: number;
  descontoPeca: number;
  quemPeca: QuemPaga;
  descontoCarrinho: number;
  quemCarrinho: QuemPaga;
  valorPago: number;
};

type Lido<T> = { ok: true; dados: T } | { ok: false; erro: string };

/** Arredonda meio centavo para cima, como em calculos.ts. */
const percentualDe = (centavos: number, pontosBase: number) => Math.floor((centavos * pontosBase + 5000) / 10000);

/** Quanto sai de desconto em cada peça, e de quem é cada parte. */
export function dividirDescontos(pecas: readonly PecaComPreco[], plano: PlanoDeDesconto): Lido<PartesDoDesconto[]> {
  const depoisDaPeca: number[] = [];
  const descontosPeca: number[] = [];
  for (const p of pecas) {
    const nome = p.codigo ? `peça ${p.codigo}` : "peça";
    const d = plano.porPeca[p.id];
    let desconto = 0;
    if (d) {
      if (d.valor < 0 || (d.tipo === "percentual" && d.valor > 10000)) {
        return { ok: false, erro: `O desconto da ${nome} não é válido.` };
      }
      desconto = d.tipo === "reais" ? d.valor : percentualDe(p.precoCentavos, d.valor);
      if (desconto > p.precoCentavos) {
        return { ok: false, erro: `O desconto da ${nome} não pode ser maior que o preço dela.` };
      }
    }
    descontosPeca.push(desconto);
    depoisDaPeca.push(p.precoCentavos - desconto);
  }

  const subtotal = depoisDaPeca.reduce((a, b) => a + b, 0);
  const c = plano.carrinho;
  let descontoCarrinho = 0;
  if (c) {
    if (c.valor < 0) return { ok: false, erro: "O desconto do carrinho não pode ser negativo." };
    if (c.modo === "percentual") {
      if (c.valor > 10000) return { ok: false, erro: "O desconto do carrinho não pode passar de 100%." };
      descontoCarrinho = percentualDe(subtotal, c.valor);
    } else if (c.modo === "reais") {
      if (c.valor > subtotal) {
        return { ok: false, erro: `O desconto do carrinho não pode ser maior que o total (${formatarReais(subtotal)}).` };
      }
      descontoCarrinho = c.valor;
    } else {
      if (c.valor === 0) return { ok: false, erro: "O valor pago precisa ser maior que zero." };
      if (c.valor > subtotal) {
        return {
          ok: false,
          erro: `O valor pago não pode ser maior que o total (${formatarReais(subtotal)}). Taxas e frete não entram aqui.`,
        };
      }
      descontoCarrinho = subtotal - c.valor;
    }
  }

  const pagos = distribuirDesconto(depoisDaPeca, descontoCarrinho);
  return {
    ok: true,
    dados: pecas.map((p, i) => ({
      pecaId: p.id,
      precoCentavos: p.precoCentavos,
      descontoPeca: descontosPeca[i],
      quemPeca: plano.porPeca[p.id]?.quem ?? "dividido",
      descontoCarrinho: depoisDaPeca[i] - pagos[i],
      quemCarrinho: c?.quem ?? "dividido",
      valorPago: pagos[i],
    })),
  };
}

const ehQuem = (v: unknown): v is QuemPaga => QUEM_PAGA.some((q) => q.valor === v);
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function lerValor(t: string, tipo: "reais" | "percentual"): number | null {
  try {
    const v = tipo === "reais" ? lerReais(t) : (lerPercentual(t) ?? 0);
    return v < 0 ? null : v;
  } catch {
    return null;
  }
}

/**
 * Lê os campos de desconto do formulário:
 * - carrinho: `desconto_modo`, `desconto`, `desconto_quem`;
 * - cada peça: `peca_desconto:<id>`, `peca_tipo:<id>`, `peca_quem:<id>`;
 * - `desconto_motivo`.
 * Campo vazio ou zero é "sem desconto".
 */
export function lerPlanoDeDesconto(valores: Record<string, unknown>, pecas: readonly PecaComPreco[]): Lido<PlanoDeDesconto> {
  const plano: PlanoDeDesconto = { carrinho: null, porPeca: {}, motivo: null };

  const modo = MODOS_CARRINHO.find((m) => m.valor === valores.desconto_modo)?.valor ?? "reais";
  const tCarrinho = texto(valores.desconto);
  if (tCarrinho) {
    const valor = lerValor(tCarrinho, modo === "percentual" ? "percentual" : "reais");
    if (valor === null) {
      return {
        ok: false,
        erro:
          modo === "percentual"
            ? "Escreva o desconto do carrinho em %, como 10 ou 7,5."
            : "Escreva o valor em reais, como 5 ou 5,50.",
      };
    }
    const quem = ehQuem(valores.desconto_quem) ? valores.desconto_quem : "dividido";
    if (modo === "valor_pago" || valor > 0) plano.carrinho = { modo, valor, quem };
  }

  for (const p of pecas) {
    const t = texto(valores[`peca_desconto:${p.id}`]);
    if (!t) continue;
    const tipo = valores[`peca_tipo:${p.id}`] === "percentual" ? "percentual" : "reais";
    const valor = lerValor(t, tipo);
    if (valor === null) {
      const nome = p.codigo ? `peça ${p.codigo}` : "peça";
      return { ok: false, erro: `Escreva o desconto da ${nome} ${tipo === "percentual" ? "em %, como 10" : "em reais, como 5,50"}.` };
    }
    const quem = valores[`peca_quem:${p.id}`];
    if (valor > 0) plano.porPeca[p.id] = { tipo, valor, quem: ehQuem(quem) ? quem : "dividido" };
  }

  const motivo = texto(valores.desconto_motivo).slice(0, 200);
  if (motivo) plano.motivo = motivo;
  return { ok: true, dados: plano };
}

export const NOMES_QUEM_PAGA: Record<QuemPaga | "misto", string> = {
  dividido: "dividido com a fornecedora",
  loja: "por conta da loja",
  fornecedora: "por conta da fornecedora",
  misto: "parte por conta de cada um",
};
