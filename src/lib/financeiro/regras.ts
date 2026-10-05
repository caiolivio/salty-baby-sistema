import { lerPercentual, lerReais } from "../importacao/notion";

// Financeiro: taxas de pagamento (maquininha e Pix), despesas da loja e o
// lucro real do mês. Funções puras, testadas. Valores em centavos; percentuais
// em pontos-base (350 = 3,5%); datas sem hora no formato aaaa-mm-dd.

/** Formas de pagamento que podem ter taxa. Dinheiro e crédito da fornecedora não têm. */
export const FORMAS_COM_TAXA = [
  { valor: "pix", nome: "Pix" },
  { valor: "cartao", nome: "Cartão" },
] as const;
export type FormaComTaxa = (typeof FORMAS_COM_TAXA)[number]["valor"];
export type Taxas = Partial<Record<FormaComTaxa, number>>;

/** Maior taxa aceita: 20%. */
const TAXA_MAXIMA = 2000;

/**
 * Taxa de uma venda: o % da forma de pagamento sobre o que entrou por ela
 * (a parte paga com o saldo da fornecedora não passa pela maquininha).
 */
export function calcularTaxa(venda: { forma: string | null; totalCentavos: number; creditoCentavos?: number }, taxas: Taxas): number {
  const percentual = venda.forma === "pix" || venda.forma === "cartao" ? (taxas[venda.forma] ?? 0) : 0;
  const base = Math.max(0, venda.totalCentavos - (venda.creditoCentavos ?? 0));
  return Math.round((base * percentual) / 10000);
}

/** "3,5" → 350. Lê o formulário das taxas (vazio = sem taxa). */
export function lerTaxas(
  valores: Partial<Record<FormaComTaxa, unknown>>,
): { ok: true; taxas: Record<FormaComTaxa, number> } | { ok: false; erro: string } {
  const taxas = {} as Record<FormaComTaxa, number>;
  for (const f of FORMAS_COM_TAXA) {
    const texto = typeof valores[f.valor] === "string" ? (valores[f.valor] as string) : "";
    let valor: number | undefined;
    try {
      valor = lerPercentual(texto) ?? 0;
    } catch {
      valor = undefined;
    }
    if (valor === undefined || valor > TAXA_MAXIMA) return { ok: false, erro: `Escreva a taxa do ${f.nome} de 0 a 20, por exemplo 3,5.` };
    taxas[f.valor] = valor;
  }
  return { ok: true, taxas };
}

/** 350 → "3,5" para o campo do formulário. */
export function percentualNoCampo(pontos: number): string {
  const inteiro = Math.floor(pontos / 100);
  const resto = pontos % 100;
  return resto === 0 ? String(inteiro) : `${inteiro},${String(resto).padStart(2, "0").replace(/0$/, "")}`;
}

/** Valor em reais digitado ("12,50", "R$ 1.200") → centavos, ou undefined se não der para ler. */
export function lerValorEmReais(valor: unknown): number | undefined {
  if (typeof valor !== "string" || !valor.trim()) return undefined;
  try {
    const centavos = lerReais(valor);
    return centavos >= 0 ? centavos : undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------- despesas

export const CATEGORIAS_DESPESA = [
  "Aluguel e contas",
  "Embalagens",
  "Frete e entregas",
  "Marketing",
  "Compra de peças",
  "Taxas e tarifas",
  "Pessoal",
  "Outros",
] as const;

export type DadosDespesa = { data: string; descricao: string; categoria: string; valorCentavos: number };

const dataValida = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`));

/** Lê o formulário de despesa: data (padrão hoje, nunca no futuro), descrição, categoria e valor. */
export function lerDespesa(
  valores: { data?: unknown; descricao?: unknown; categoria?: unknown; valor?: unknown },
  hoje: string,
): { ok: true; dados: DadosDespesa } | { ok: false; erro: string } {
  const data = typeof valores.data === "string" && valores.data.trim() ? valores.data.trim() : hoje;
  if (!dataValida(data)) return { ok: false, erro: "A data da despesa não é válida." };
  if (data > hoje) return { ok: false, erro: "A data da despesa não pode ser no futuro." };
  const descricao = typeof valores.descricao === "string" ? valores.descricao.trim().replace(/\s+/g, " ") : "";
  if (!descricao) return { ok: false, erro: "Escreva o que foi a despesa." };
  if (descricao.length > 160) return { ok: false, erro: "A descrição pode ter até 160 letras." };
  const categoria = CATEGORIAS_DESPESA.find((c) => c === valores.categoria);
  if (!categoria) return { ok: false, erro: "Escolha a categoria da despesa." };
  const valorCentavos = lerValorEmReais(valores.valor);
  if (!valorCentavos) return { ok: false, erro: "Escreva o valor da despesa, por exemplo 45,90." };
  if (valorCentavos > 100_000_000) return { ok: false, erro: "Confira o valor: parece alto demais." };
  return { ok: true, dados: { data, descricao, categoria, valorCentavos } };
}

// ---------------------------------------------------------------- resumo do mês

export type VendaDoResumo = {
  data: Date;
  totalCentavos: number;
  creditoCentavos: number;
  taxaCentavos: number;
  itens: { tipo: string; repasseCentavos: number; custoCentavos: number | null; lucroCentavos: number; quantidade: number }[];
};
export type DespesaDoResumo = { data: Date; categoria: string; valorCentavos: number };

export type ResumoFinanceiro = {
  mes: string;
  vendas: number;
  pecas: number;
  /** Total das vendas (inclui a parte paga com o saldo das fornecedoras). */
  vendidoCentavos: number;
  /** O que entrou de verdade (sem a parte paga com o saldo). */
  recebidoCentavos: number;
  /** Repasse das peças consignadas (vai para as fornecedoras). */
  repassesCentavos: number;
  /** Custo das peças da loja vendidas. */
  custoCentavos: number;
  /** Vendido menos repasses e custo das peças. */
  lucroBrutoCentavos: number;
  taxasCentavos: number;
  despesasCentavos: number;
  /** Lucro bruto menos taxas e despesas. */
  lucroRealCentavos: number;
  despesasPorCategoria: { categoria: string; valorCentavos: number }[];
};

const mesDe = (d: Date) => d.toISOString().slice(0, 7);

/** Resumo de um mês (aaaa-mm) a partir das vendas e despesas (pode receber mais meses; filtra). */
export function resumoDoMes(vendas: readonly VendaDoResumo[], despesas: readonly DespesaDoResumo[], mes: string): ResumoFinanceiro {
  const r: ResumoFinanceiro = {
    mes,
    vendas: 0,
    pecas: 0,
    vendidoCentavos: 0,
    recebidoCentavos: 0,
    repassesCentavos: 0,
    custoCentavos: 0,
    lucroBrutoCentavos: 0,
    taxasCentavos: 0,
    despesasCentavos: 0,
    lucroRealCentavos: 0,
    despesasPorCategoria: [],
  };
  for (const v of vendas) {
    if (mesDe(v.data) !== mes) continue;
    r.vendas += 1;
    r.vendidoCentavos += v.totalCentavos;
    r.recebidoCentavos += v.totalCentavos - v.creditoCentavos;
    r.taxasCentavos += v.taxaCentavos;
    for (const i of v.itens) {
      r.pecas += i.quantidade;
      r.lucroBrutoCentavos += i.lucroCentavos;
      if (i.tipo === "consignada") r.repassesCentavos += i.repasseCentavos;
      else r.custoCentavos += i.custoCentavos ?? 0;
    }
  }
  const porCategoria = new Map<string, number>();
  for (const d of despesas) {
    if (mesDe(d.data) !== mes) continue;
    r.despesasCentavos += d.valorCentavos;
    porCategoria.set(d.categoria, (porCategoria.get(d.categoria) ?? 0) + d.valorCentavos);
  }
  r.despesasPorCategoria = [...porCategoria]
    .map(([categoria, valorCentavos]) => ({ categoria, valorCentavos }))
    .sort((a, b) => b.valorCentavos - a.valorCentavos);
  r.lucroRealCentavos = r.lucroBrutoCentavos - r.taxasCentavos - r.despesasCentavos;
  return r;
}

/** Os 12 meses até o mês informado, do mais antigo para o mais novo: "2026-10" → "2025-11" … "2026-10". */
export function dozeMeses(mes: string): string[] {
  const [ano, m] = mes.split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(ano, m - 12 + i, 1)).toISOString().slice(0, 7));
}
