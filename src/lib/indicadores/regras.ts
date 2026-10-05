import type { Periodo } from "../clientes/perfil";

// Indicadores da loja: vendas do período comparadas com o período anterior,
// de onde vêm as vendas, o que mais vende e como está o estoque. Funções puras,
// testadas. Valores em centavos; datas sem hora no formato aaaa-mm-dd.

const DIA = 86_400_000;
const data = (t: string) => new Date(`${t}T00:00:00Z`);
const texto = (d: Date) => d.toISOString().slice(0, 10);

/** Peça à venda há mais que isto é "parada". */
export const DIAS_PARADA = 90;

/**
 * O período de comparação: num mês, os mesmos dias do mês anterior (de 1 a 5
 * de outubro compara com 1 a 5 de setembro); nos outros, o mesmo número de
 * dias logo antes.
 */
export function periodoAnterior(p: Pick<Periodo, "tipo" | "de" | "ate">): { de: string; ate: string } {
  if (p.tipo === "mensal") {
    const [ano, mes] = p.de.split("-").map(Number);
    const ultimoDia = new Date(Date.UTC(ano, mes - 1, 0)).getUTCDate();
    const dia = Math.min(Number(p.ate.slice(8, 10)), ultimoDia);
    const inicio = texto(new Date(Date.UTC(ano, mes - 2, 1)));
    return { de: inicio, ate: `${inicio.slice(0, 8)}${String(dia).padStart(2, "0")}` };
  }
  const dias = Math.round((data(p.ate).getTime() - data(p.de).getTime()) / DIA) + 1;
  const ate = new Date(data(p.de).getTime() - DIA);
  return { de: texto(new Date(ate.getTime() - (dias - 1) * DIA)), ate: texto(ate) };
}

export type ItemDoIndicador = {
  quantidade: number;
  valorPagoCentavos: number;
  lucroCentavos: number;
  peca: {
    marca: string | null;
    tamanho: string | null;
    dataEntrada: Date;
    categorias: string[];
    fornecedora: { codigo: string; nome: string } | null;
  };
};

export type VendaDoIndicador = {
  data: Date;
  totalCentavos: number;
  canal: string;
  grupo: string | null;
  formaPagamento: string | null;
  clienteId: string | null;
  itens: ItemDoIndicador[];
};

export type Numeros = { faturamentoCentavos: number; lucroCentavos: number; vendas: number; pecas: number; ticketMedioCentavos: number };

const dentro = (d: Date, de: string, ate: string) => {
  const t = texto(d);
  return t >= de && t <= ate;
};

export function numerosDasVendas(vendas: readonly VendaDoIndicador[], de: string, ate: string): Numeros {
  const r = { faturamentoCentavos: 0, lucroCentavos: 0, vendas: 0, pecas: 0, ticketMedioCentavos: 0 };
  for (const v of vendas) {
    if (!dentro(v.data, de, ate)) continue;
    r.vendas++;
    r.faturamentoCentavos += v.totalCentavos;
    for (const i of v.itens) {
      r.pecas += i.quantidade;
      r.lucroCentavos += i.lucroCentavos;
    }
  }
  r.ticketMedioCentavos = r.vendas ? Math.round(r.faturamentoCentavos / r.vendas) : 0;
  return r;
}

/** Quanto mudou em %, arredondado (null quando antes era zero: não dá para comparar). */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

export type Fatia = { nome: string; valorCentavos: number; quantidade: number; parte: number };

/** Soma por nome, do maior para o menor, com a parte de cada um no total (0 a 100). */
export function ranking(linhas: readonly { nome: string; valorCentavos: number; quantidade: number }[], limite = 10): Fatia[] {
  const soma = new Map<string, { valorCentavos: number; quantidade: number }>();
  for (const l of linhas) {
    const atual = soma.get(l.nome) ?? { valorCentavos: 0, quantidade: 0 };
    atual.valorCentavos += l.valorCentavos;
    atual.quantidade += l.quantidade;
    soma.set(l.nome, atual);
  }
  const total = [...soma.values()].reduce((s, v) => s + v.valorCentavos, 0);
  return [...soma]
    .map(([nome, v]) => ({ nome, ...v, parte: total ? Math.round((v.valorCentavos / total) * 100) : 0 }))
    .sort((a, b) => b.valorCentavos - a.valorCentavos || b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limite);
}

export const NOMES_CANAIS: Record<string, string> = {
  site: "Site",
  whatsapp_privado: "WhatsApp (privado)",
  grupo_whatsapp: "Grupos de WhatsApp",
  instagram: "Instagram",
  loja: "Loja",
  bag: "Bag",
};
const NOMES_FORMAS: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  credito_fornecedora: "Crédito da fornecedora",
};

export type Rankings = {
  canais: Fatia[];
  grupos: Fatia[];
  formas: Fatia[];
  fornecedoras: Fatia[];
  marcas: Fatia[];
  categorias: Fatia[];
  tamanhos: Fatia[];
};

/** O que mais vendeu no período, por canal, grupo, forma de pagamento, fornecedora, marca, categoria e tamanho. */
export function rankingsDoPeriodo(vendas: readonly VendaDoIndicador[], de: string, ate: string): Rankings {
  const doPeriodo = vendas.filter((v) => dentro(v.data, de, ate));
  const itens = doPeriodo.flatMap((v) => v.itens);
  const porItem = (nome: (i: ItemDoIndicador) => string | null) =>
    ranking(
      itens.flatMap((i) => {
        const n = nome(i);
        return n ? [{ nome: n, valorCentavos: i.valorPagoCentavos, quantidade: i.quantidade }] : [];
      }),
    );
  const pecas = (v: VendaDoIndicador) => v.itens.reduce((s, i) => s + i.quantidade, 0);
  return {
    canais: ranking(
      doPeriodo.map((v) => ({ nome: NOMES_CANAIS[v.canal] ?? v.canal, valorCentavos: v.totalCentavos, quantidade: pecas(v) })),
    ),
    grupos: ranking(
      doPeriodo.filter((v) => v.grupo).map((v) => ({ nome: v.grupo as string, valorCentavos: v.totalCentavos, quantidade: pecas(v) })),
    ),
    formas: ranking(
      doPeriodo.map((v) => ({
        nome: NOMES_FORMAS[v.formaPagamento ?? ""] ?? "Não informada",
        valorCentavos: v.totalCentavos,
        quantidade: pecas(v),
      })),
    ),
    fornecedoras: porItem((i) => (i.peca.fornecedora ? `${i.peca.fornecedora.codigo} · ${i.peca.fornecedora.nome}` : null)),
    marcas: porItem((i) => i.peca.marca?.trim() || null),
    categorias: ranking(
      itens.flatMap((i) => i.peca.categorias.map((c) => ({ nome: c, valorCentavos: i.valorPagoCentavos, quantidade: i.quantidade }))),
    ),
    tamanhos: porItem((i) => i.peca.tamanho),
  };
}

/** Dias que as peças vendidas no período ficaram à venda (da entrada à venda): a mediana, ou null sem vendas. */
export function diasAteVender(vendas: readonly VendaDoIndicador[], de: string, ate: string): number | null {
  const dias = vendas
    .filter((v) => dentro(v.data, de, ate))
    .flatMap((v) => v.itens.map((i) => Math.max(0, Math.round((v.data.getTime() - i.peca.dataEntrada.getTime()) / DIA))))
    .sort((a, b) => a - b);
  if (dias.length === 0) return null;
  const meio = Math.floor(dias.length / 2);
  return dias.length % 2 ? dias[meio] : Math.round((dias[meio - 1] + dias[meio]) / 2);
}

/**
 * Clientes que compraram no período: quantas, quantas pela primeira vez e
 * quantas voltaram. `primeiraCompra` (cliente → aaaa-mm-dd) vem de todas as
 * vendas; sem ela, usa só as vendas recebidas.
 */
export function clientesDoPeriodo(
  vendas: readonly VendaDoIndicador[],
  de: string,
  ate: string,
  primeiraCompra?: ReadonlyMap<string, string>,
) {
  const primeira = new Map(primeiraCompra ?? []);
  if (!primeiraCompra) {
    for (const v of vendas) {
      if (!v.clienteId) continue;
      const t = texto(v.data);
      const antes = primeira.get(v.clienteId);
      if (!antes || t < antes) primeira.set(v.clienteId, t);
    }
  }
  const compraram = new Set(vendas.filter((v) => v.clienteId && dentro(v.data, de, ate)).map((v) => v.clienteId as string));
  let novas = 0;
  for (const id of compraram) if ((primeira.get(id) ?? de) >= de) novas++;
  return { compraram: compraram.size, novas, voltaram: compraram.size - novas };
}

export type PecaEmEstoque = { id: string; codigo: string; nome: string; precoCentavos: number; quantidade: number; dataEntrada: Date };

/** Estoque à venda: quantas peças, quanto valem e as paradas há mais de DIAS_PARADA dias (as mais antigas primeiro). */
export function estoque(pecas: readonly PecaEmEstoque[], hoje: string, diasParada = DIAS_PARADA) {
  const corte = data(hoje).getTime() - diasParada * DIA;
  const paradas = pecas
    .filter((p) => p.dataEntrada.getTime() <= corte)
    .map((p) => ({ ...p, dias: Math.round((data(hoje).getTime() - p.dataEntrada.getTime()) / DIA) }))
    .sort((a, b) => b.dias - a.dias || a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
  return {
    pecas: pecas.reduce((s, p) => s + p.quantidade, 0),
    valorCentavos: pecas.reduce((s, p) => s + p.precoCentavos * p.quantidade, 0),
    paradas,
    valorParadoCentavos: paradas.reduce((s, p) => s + p.precoCentavos * p.quantidade, 0),
  };
}

/** Pedidos do site fechados no período e quantos viraram venda. */
export function conversaoDePedidos(pedidos: readonly { status: string }[]) {
  const fechados = pedidos.length;
  const pagos = pedidos.filter((p) => p.status === "pago").length;
  const abertos = pedidos.filter((p) => p.status === "reservado").length;
  return {
    fechados,
    pagos,
    abertos,
    perdidos: fechados - pagos - abertos,
    taxa: fechados - abertos > 0 ? Math.round((pagos / (fechados - abertos)) * 100) : null,
  };
}
