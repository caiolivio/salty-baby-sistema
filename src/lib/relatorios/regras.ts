import type { Periodo } from "../clientes/perfil";
import { formatarData } from "../datas";
import { formatarReais } from "../dinheiro";
import { vendasNoPeriodo, type BarraDeVendas } from "../fornecedoras/saldos";

// Relatório mensal da fornecedora: só as vendas do mês (sem peças não
// vendidas), com gráfico. Fica pronto no dia 1, quando o mês fecha, vai pelo
// WhatsApp e fica na área dela. Funções puras, testadas. Valores em centavos;
// mês no formato aaaa-mm.

const NOMES_MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-09" se for um mês válido; senão null. */
export function lerMes(valor: unknown): string | null {
  if (typeof valor !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) return null;
  return valor;
}

/** O mês passado (o último relatório pronto): "2026-10-03" → "2026-09". */
export function mesAnterior(mesOuHoje: string): string {
  const [ano, mes] = mesOuHoje.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 2, 1)).toISOString().slice(0, 7);
}

/** O relatório só existe depois que o mês acaba (no dia 1 do mês seguinte). */
export function mesFechado(mes: string, hoje: string): boolean {
  return mes < hoje.slice(0, 7);
}

/** "setembro de 2026". */
export function nomeDoMesDoRelatorio(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${NOMES_MESES[m - 1]} de ${ano}`;
}

/** O mês inteiro, do dia 1 ao último dia, com uma barra por dia no gráfico. */
export function periodoDoMes(mes: string): Periodo {
  const [ano, m] = mes.split("-").map(Number);
  const ate = new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);
  return { tipo: "mensal", de: `${mes}-01`, ate, mes, por: "dia", rotulo: nomeDoMesDoRelatorio(mes) };
}

export type ItemDoRelatorio = {
  id: string;
  data: Date;
  quantidade: number;
  precoUnitarioCentavos: number;
  descontoCentavos: number;
  valorPagoCentavos: number;
  repasseCentavos: number;
  repasseRecebido: boolean;
  peca: { codigo: string; nome: string };
};

export type RelatorioDoMes<I extends ItemDoRelatorio = ItemDoRelatorio> = {
  mes: string;
  nome: string;
  pecas: number;
  vendidoCentavos: number;
  repasseCentavos: number;
  descontoCentavos: number;
  /** Repasse do mês anterior, para comparar. */
  repasseMesAnteriorCentavos: number;
  /** Uma barra por semana do mês (a última pode ter menos de 7 dias). */
  barras: BarraDeVendas[];
  /** As vendas do mês, da mais antiga para a mais nova. */
  itens: I[];
};

const mesDe = (d: Date) => d.toISOString().slice(0, 7);

/** Vendas, totais e gráfico de um mês, a partir de todas as vendas da fornecedora. */
export function relatorioDoMes<I extends ItemDoRelatorio>(todos: readonly I[], mes: string): RelatorioDoMes<I> {
  const itens = todos
    .filter((i) => mesDe(i.data) === mes)
    .sort((a, b) => a.data.getTime() - b.data.getTime() || a.peca.codigo.localeCompare(b.peca.codigo, "pt-BR", { numeric: true }));
  const { repasseCentavos, vendidoCentavos, pecas, barras: dias } = vendasNoPeriodo(itens, periodoDoMes(mes));
  // Uma barra por semana do mês (1 a 7, 8 a 14...): cabe na tela do celular sem rolar.
  const barras: BarraDeVendas[] = [];
  for (let i = 0; i < dias.length; i += 7) {
    const semana = dias.slice(i, i + 7);
    const primeiro = semana[0].chave.slice(8, 10);
    const ultimo = semana[semana.length - 1].chave;
    barras.push({
      chave: `${mes}-s${barras.length + 1}`,
      rotulo: `${primeiro} a ${ultimo.slice(8, 10)}/${ultimo.slice(5, 7)}`,
      repasseCentavos: semana.reduce((s, d) => s + d.repasseCentavos, 0),
      pecas: semana.reduce((s, d) => s + d.pecas, 0),
    });
  }
  const anterior = mesAnterior(mes);
  return {
    mes,
    nome: nomeDoMesDoRelatorio(mes),
    pecas,
    vendidoCentavos,
    repasseCentavos,
    descontoCentavos: itens.reduce((s, i) => s + i.descontoCentavos, 0),
    repasseMesAnteriorCentavos: todos.filter((i) => mesDe(i.data) === anterior).reduce((s, i) => s + i.repasseCentavos, 0),
    barras,
    itens,
  };
}

export type MesComVendas = { mes: string; nome: string; pecas: number; repasseCentavos: number };

/** Os meses já fechados em que ela vendeu alguma coisa, do mais recente para o mais antigo. */
export function mesesComVendas(
  itens: readonly { data: Date; quantidade: number; repasseCentavos: number }[],
  hoje: string,
): MesComVendas[] {
  const porMes = new Map<string, MesComVendas>();
  for (const i of itens) {
    const mes = mesDe(i.data);
    if (!mesFechado(mes, hoje)) continue;
    const m = porMes.get(mes) ?? { mes, nome: nomeDoMesDoRelatorio(mes), pecas: 0, repasseCentavos: 0 };
    m.pecas += i.quantidade;
    m.repasseCentavos += i.repasseCentavos;
    porMes.set(mes, m);
  }
  return [...porMes.values()].sort((a, b) => b.mes.localeCompare(a.mes));
}

/** Mensagem do relatório para mandar no WhatsApp (o *negrito* é do WhatsApp). */
export function textoDoRelatorio(r: { loja: string; fornecedora: { nome: string }; relatorio: RelatorioDoMes }, link?: string): string {
  const { relatorio: m } = r;
  const nome = r.fornecedora.nome.trim().split(/\s+/)[0] || r.fornecedora.nome;
  const pecas = `${m.pecas} peça${m.pecas === 1 ? "" : "s"}`;
  const linhas = [
    `*${r.loja} · Relatório de ${m.nome}*`,
    "",
    `Olá, ${nome}! Em ${m.nome} você vendeu ${pecas} na ${r.loja}.`,
    "",
    `Total vendido: ${formatarReais(m.vendidoCentavos)}`,
  ];
  if (m.descontoCentavos > 0) linhas.push(`Descontos: ${formatarReais(m.descontoCentavos)}`);
  linhas.push(`*Seu repasse: ${formatarReais(m.repasseCentavos)}*`);
  if (m.repasseMesAnteriorCentavos > 0) {
    linhas.push(`No mês anterior, o seu repasse foi de ${formatarReais(m.repasseMesAnteriorCentavos)}.`);
  }
  linhas.push(
    "",
    "*Peças vendidas:*",
    ...m.itens.map(
      (i) =>
        `• ${i.peca.codigo} · ${i.peca.nome}: ${formatarData(i.data)}, ${formatarReais(i.valorPagoCentavos)} (seu repasse ${formatarReais(i.repasseCentavos)})`,
    ),
  );
  if (link) linhas.push("", `O relatório com o gráfico fica na sua área: ${link}`);
  linhas.push("", "Obrigada pela parceria!");
  return linhas.join("\n");
}
