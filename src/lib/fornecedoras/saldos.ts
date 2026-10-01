// Área da fornecedora: saldos, vendas no período e regra da devolução.
// Funções puras, testadas. Valores em centavos.

import { calcularRepasse } from "../calculos";
import { dentroDoPeriodo, type Periodo } from "../clientes/perfil";

/** A fornecedora pode pedir a peça de volta só depois de 6 meses da entrada. */
export const MESES_PARA_DEVOLUCAO = 6;

/** Status em que a peça ainda está com a Salty, esperando venda. */
export const STATUS_A_VENDA = ["publicada", "reservada"] as const;
/** Status em que dá para pedir a peça de volta (à venda ou ainda em cadastro). */
export const STATUS_DEVOLVIVEIS = ["publicada", "rascunho"] as const;

/** Data (aaaa-mm-dd) a partir da qual a peça pode ser devolvida. */
export function devolucaoDisponivelEm(dataEntrada: Date): string {
  const ano = dataEntrada.getUTCFullYear();
  const mes = dataEntrada.getUTCMonth() + MESES_PARA_DEVOLUCAO;
  const dia = dataEntrada.getUTCDate();
  // 31/08 + 6 meses = 28/02 (ou 29/02), nunca "31/02" virando março.
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDia))).toISOString().slice(0, 10);
}

export type SituacaoDevolucaoDaPeca =
  | { tipo: "pode" }
  | { tipo: "a-partir-de"; data: string }
  | { tipo: "pedida" }
  | { tipo: "nao-se-aplica" };

/** Se a peça pode ser pedida de volta hoje (aaaa-mm-dd), e desde quando. */
export function situacaoDaDevolucao(peca: { status: string; dataEntrada: Date }, hoje: string): SituacaoDevolucaoDaPeca {
  if (peca.status === "devolucao_pedida") return { tipo: "pedida" };
  if (!(STATUS_DEVOLVIVEIS as readonly string[]).includes(peca.status)) return { tipo: "nao-se-aplica" };
  const data = devolucaoDisponivelEm(peca.dataEntrada);
  return data <= hoje ? { tipo: "pode" } : { tipo: "a-partir-de", data };
}

export type ItemVendido = { data: Date; valorPagoCentavos: number; repasseCentavos: number; repasseRecebido: boolean; quantidade: number };
export type PecaDaFornecedora = { status: string; precoCentavos: number; quantidade: number; percentualRepasse: number | null };

export type Saldos = {
  /** Repasse das peças vendidas que ela ainda não recebeu (desde sempre). */
  aReceberCentavos: number;
  /** Quanto ela receberia se as peças à venda fossem vendidas pelo preço de hoje. */
  aVendaCentavos: number;
  /** Tudo o que ela já ganhou com as vendas (recebido e a receber). */
  acumuladoCentavos: number;
  recebidoCentavos: number;
  pecasAVenda: number;
  pecasVendidas: number;
};

export function calcularSaldos(pecas: PecaDaFornecedora[], itens: ItemVendido[]): Saldos {
  let aReceber = 0;
  let acumulado = 0;
  let vendidas = 0;
  for (const i of itens) {
    acumulado += i.repasseCentavos;
    if (!i.repasseRecebido) aReceber += i.repasseCentavos;
    vendidas += i.quantidade;
  }
  let aVenda = 0;
  let pecasAVenda = 0;
  for (const p of pecas) {
    if (!(STATUS_A_VENDA as readonly string[]).includes(p.status) || p.quantidade <= 0) continue;
    pecasAVenda += p.quantidade;
    aVenda += calcularRepasse(p.precoCentavos, p.percentualRepasse ?? 0) * p.quantidade;
  }
  return {
    aReceberCentavos: aReceber,
    aVendaCentavos: aVenda,
    acumuladoCentavos: acumulado,
    recebidoCentavos: acumulado - aReceber,
    pecasAVenda,
    pecasVendidas: vendidas,
  };
}

export type BarraDeVendas = { chave: string; rotulo: string; repasseCentavos: number; pecas: number };

/** Vendas no período: totais e barras por dia ou por mês (inclusive as vazias), para os gráficos. */
export function vendasNoPeriodo(
  itens: ItemVendido[],
  periodo: Periodo,
): { repasseCentavos: number; vendidoCentavos: number; pecas: number; barras: BarraDeVendas[] } {
  const barras: BarraDeVendas[] = [];
  const dia = (t: string) => new Date(`${t}T00:00:00Z`);
  if (periodo.por === "dia") {
    for (let t = dia(periodo.de).getTime(); t <= dia(periodo.ate).getTime(); t += 86_400_000) {
      const chave = new Date(t).toISOString().slice(0, 10);
      barras.push({ chave, rotulo: `${chave.slice(8, 10)}/${chave.slice(5, 7)}`, repasseCentavos: 0, pecas: 0 });
    }
  } else {
    const [a, m] = periodo.de.split("-").map(Number);
    for (let i = 0; ; i++) {
      const chave = new Date(Date.UTC(a, m - 1 + i, 1)).toISOString().slice(0, 7);
      if (chave > periodo.ate.slice(0, 7)) break;
      barras.push({ chave, rotulo: `${MESES_CURTOS[Number(chave.slice(5, 7)) - 1]}/${chave.slice(2, 4)}`, repasseCentavos: 0, pecas: 0 });
    }
  }
  let repasse = 0;
  let vendido = 0;
  let pecas = 0;
  for (const i of itens) {
    if (!dentroDoPeriodo(i.data, periodo)) continue;
    repasse += i.repasseCentavos;
    vendido += i.valorPagoCentavos;
    pecas += i.quantidade;
    const texto = i.data.toISOString().slice(0, 10);
    const barra = barras.find((b) => b.chave === (periodo.por === "dia" ? texto : texto.slice(0, 7)));
    if (barra) {
      barra.repasseCentavos += i.repasseCentavos;
      barra.pecas += i.quantidade;
    }
  }
  return { repasseCentavos: repasse, vendidoCentavos: vendido, pecas, barras };
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
