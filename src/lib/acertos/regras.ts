import { formatarData } from "../datas";
import { formatarReais } from "../dinheiro";

// Acerto com as fornecedoras: quanto cada uma tem a receber, o pagamento de
// vários repasses de uma vez e o texto do comprovante. Funções puras, testadas.
// Valores em centavos; datas sem hora no formato aaaa-mm-dd.

export const FORMAS_ACERTO = [
  { valor: "pix", nome: "Pix" },
  { valor: "dinheiro", nome: "Dinheiro" },
  { valor: "transferencia", nome: "Transferência" },
  { valor: "outro", nome: "Outro" },
] as const;
export type FormaAcerto = (typeof FORMAS_ACERTO)[number]["valor"];

export const nomeDaFormaAcerto = (forma: string) => FORMAS_ACERTO.find((f) => f.valor === forma)?.nome ?? forma;

/** Último dia do mês anterior a hoje: o acerto do dia 1 paga as vendas até essa data. */
export function fimDoMesAnterior(hoje: string): string {
  const [ano, mes] = hoje.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, 0)).toISOString().slice(0, 10);
}

/** "setembro de 2026", para dizer de que mês é o acerto. */
export function nomeDoMes(data: string): string {
  const [ano, mes] = data.split("-").map(Number);
  return `${MESES[mes - 1]} de ${ano}`;
}

const MESES = [
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

const dia = (d: Date) => d.toISOString().slice(0, 10);

export type ItemPendente = { id: string; data: Date; repasseCentavos: number; quantidade: number };

export type APagar = {
  /** Vendas até o fim do mês passado: é o que o acerto do dia 1 paga. */
  fechadoCentavos: number;
  pecasFechadas: number;
  /** Vendas deste mês, que entram no próximo acerto. */
  mesAtualCentavos: number;
  pecasMesAtual: number;
  totalCentavos: number;
};

/** Separa os repasses que faltam pagar entre o mês fechado e o mês atual. */
export function resumirAPagar(itens: readonly ItemPendente[], hoje: string): APagar {
  const corte = fimDoMesAnterior(hoje);
  const r: APagar = { fechadoCentavos: 0, pecasFechadas: 0, mesAtualCentavos: 0, pecasMesAtual: 0, totalCentavos: 0 };
  for (const i of itens) {
    if (dia(i.data) <= corte) {
      r.fechadoCentavos += i.repasseCentavos;
      r.pecasFechadas += i.quantidade;
    } else {
      r.mesAtualCentavos += i.repasseCentavos;
      r.pecasMesAtual += i.quantidade;
    }
    r.totalCentavos += i.repasseCentavos;
  }
  return r;
}

/** Vem marcado no formulário: o que foi vendido até o fim do mês passado. */
export function marcadoDeInicio(item: { data: Date }, hoje: string): boolean {
  return dia(item.data) <= fimDoMesAnterior(hoje);
}

export type DadosAcerto = { itemIds: string[]; data: string; forma: FormaAcerto; observacao: string | null };

/**
 * Lê o formulário "Pagar repasses": as vendas marcadas (campo "item", só as
 * pendentes desta fornecedora), a data do pagamento, a forma e a observação.
 */
export function lerAcerto(
  valores: { itens: unknown[]; data?: unknown; forma?: unknown; observacao?: unknown },
  pendentes: readonly { id: string }[],
  hoje: string,
): { ok: true; dados: DadosAcerto } | { ok: false; erro: string } {
  const validos = new Set(pendentes.map((p) => p.id));
  const itemIds = [...new Set(valores.itens.filter((v): v is string => typeof v === "string" && validos.has(v)))];
  if (itemIds.length === 0) return { ok: false, erro: "Marque pelo menos uma venda para pagar." };

  const data = typeof valores.data === "string" && valores.data.trim() ? valores.data.trim() : hoje;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(`${data}T00:00:00Z`))) {
    return { ok: false, erro: "A data do pagamento não é válida." };
  }
  if (data > hoje) return { ok: false, erro: "A data do pagamento não pode ser no futuro." };

  const forma = FORMAS_ACERTO.find((f) => f.valor === valores.forma)?.valor;
  if (!forma) return { ok: false, erro: "Escolha a forma de pagamento." };

  const texto = typeof valores.observacao === "string" ? valores.observacao.trim().replace(/\s+/g, " ") : "";
  if (texto.length > 200) return { ok: false, erro: "A observação pode ter até 200 letras." };

  return { ok: true, dados: { itemIds, data, forma, observacao: texto || null } };
}

export type ItemDoComprovante = {
  codigo: string;
  nome: string;
  data: Date;
  valorPagoCentavos: number;
  repasseCentavos: number;
};

export type Comprovante = {
  loja: string;
  numero: number;
  fornecedora: { codigo: string; nome: string };
  data: Date;
  forma: string;
  totalCentavos: number;
  observacao: string | null;
  itens: readonly ItemDoComprovante[];
};

/** Mensagem do comprovante para mandar no WhatsApp (o *negrito* é do WhatsApp). */
export function textoDoComprovante(c: Comprovante, link?: string): string {
  const vendido = c.itens.reduce((s, i) => s + i.valorPagoCentavos, 0);
  const linhas = [
    `*${c.loja} · Comprovante de repasse nº ${c.numero}*`,
    "",
    `Olá, ${primeiroNome(c.fornecedora.nome)}! Pagamos o seu repasse de ${formatarReais(c.totalCentavos)} em ${formatarData(c.data)} (${nomeDaFormaAcerto(c.forma)}).`,
    "",
    `*Peças vendidas (${c.itens.length}):*`,
    ...c.itens.map(
      (i) =>
        `• ${i.codigo} · ${i.nome}: vendida em ${formatarData(i.data)} por ${formatarReais(i.valorPagoCentavos)}, seu repasse ${formatarReais(i.repasseCentavos)}`,
    ),
    "",
    `Total vendido: ${formatarReais(vendido)}`,
    `*Total do repasse: ${formatarReais(c.totalCentavos)}*`,
  ];
  if (c.observacao) linhas.push("", `Obs.: ${c.observacao}`);
  if (link) linhas.push("", `O comprovante também fica na sua área: ${link}`);
  linhas.push("", "Obrigada pela parceria!");
  return linhas.join("\n");
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
