// Promoções (CLAUDE.md, "Descontos"): peças escolhidas com um desconto e um
// período. O preço do cadastro não muda; a vitrine mostra o antigo riscado.
// Funções puras, testadas.

import { formatarReais } from "../dinheiro";
import { lerPercentual, lerReais } from "../importacao/notion";

export type TipoDesconto = "reais" | "percentual";

export type RegraDaPromocao = {
  id: string;
  nome: string;
  tipo: TipoDesconto;
  /** Centavos (reais) ou pontos-base (percentual, 2000 = 20%). */
  valor: number;
  inicio: string;
  fim: string;
  porContaDaLoja: boolean;
  ativa: boolean;
};

/** Preço com a promoção de uma peça: o que a cliente paga. */
export type PrecoDaPromocao = {
  promocaoId: string;
  nome: string;
  fim: string;
  porContaDaLoja: boolean;
  precoAntigoCentavos: number;
  descontoCentavos: number;
  precoCentavos: number;
};

/** Desconto em centavos sobre um preço (meio centavo arredonda para cima), nunca maior que o preço. */
export function descontoDaPromocao(precoCentavos: number, regra: Pick<RegraDaPromocao, "tipo" | "valor">): number {
  const d = regra.tipo === "reais" ? regra.valor : Math.floor((precoCentavos * regra.valor + 5000) / 10000);
  return Math.max(0, Math.min(precoCentavos, d));
}

export function promocaoValendo(regra: Pick<RegraDaPromocao, "ativa" | "inicio" | "fim">, hoje: string): boolean {
  return regra.ativa && regra.inicio <= hoje && hoje <= regra.fim;
}

/** A promoção que vale hoje para a peça. Se ela estiver em mais de uma, vale a de maior desconto. */
export function melhorPromocao(precoCentavos: number, regras: readonly RegraDaPromocao[], hoje: string): PrecoDaPromocao | null {
  let melhor: PrecoDaPromocao | null = null;
  for (const r of regras) {
    if (!promocaoValendo(r, hoje)) continue;
    const descontoCentavos = descontoDaPromocao(precoCentavos, r);
    if (descontoCentavos <= 0 || (melhor && melhor.descontoCentavos >= descontoCentavos)) continue;
    melhor = {
      promocaoId: r.id,
      nome: r.nome,
      fim: r.fim,
      porContaDaLoja: r.porContaDaLoja,
      precoAntigoCentavos: precoCentavos,
      descontoCentavos,
      precoCentavos: precoCentavos - descontoCentavos,
    };
  }
  return melhor;
}

export type SituacaoDaPromocao = "programada" | "valendo" | "encerrada" | "pausada";

export function situacaoDaPromocao(regra: Pick<RegraDaPromocao, "ativa" | "inicio" | "fim">, hoje: string): SituacaoDaPromocao {
  if (!regra.ativa) return "pausada";
  if (hoje < regra.inicio) return "programada";
  if (hoje > regra.fim) return "encerrada";
  return "valendo";
}

export const NOMES_SITUACAO: Record<SituacaoDaPromocao, string> = {
  programada: "Programada",
  valendo: "Valendo",
  encerrada: "Encerrada",
  pausada: "Pausada",
};

/** "20% de desconto" ou "R$ 10,00 de desconto". */
export function descricaoDoDesconto(regra: Pick<RegraDaPromocao, "tipo" | "valor">): string {
  if (regra.tipo === "reais") return `${formatarReais(regra.valor)} de desconto`;
  const p = (regra.valor / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return `${p}% de desconto`;
}

/** Preço para o post do WhatsApp: "~R$ 50,00~ por R$ 35,00" (o til risca no WhatsApp). */
export function precoDoPost(precoCentavos: number, promocao: Pick<PrecoDaPromocao, "precoCentavos"> | null | undefined): string {
  if (!promocao || promocao.precoCentavos >= precoCentavos) return formatarReais(precoCentavos);
  return `~${formatarReais(precoCentavos)}~ por ${formatarReais(promocao.precoCentavos)}`;
}

const dataValida = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`));
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export type DadosDaPromocao = Omit<RegraDaPromocao, "id">;

/** Lê o formulário da promoção. */
export function lerPromocao(
  valores: { nome?: unknown; tipo?: unknown; valor?: unknown; inicio?: unknown; fim?: unknown; quem?: unknown; ativa?: unknown },
  hoje: string,
): { ok: true; dados: DadosDaPromocao } | { ok: false; erro: string } {
  const nome = texto(valores.nome).replace(/\s+/g, " ");
  if (nome.length < 2) return { ok: false, erro: "Dê um nome para a promoção, como “Liquida de inverno”." };
  if (nome.length > 80) return { ok: false, erro: "O nome pode ter até 80 letras." };
  const tipo: TipoDesconto = valores.tipo === "reais" ? "reais" : "percentual";
  let valor: number | undefined;
  try {
    valor = tipo === "reais" ? lerReais(texto(valores.valor)) : lerPercentual(texto(valores.valor));
  } catch {
    valor = undefined;
  }
  if (!valor || valor <= 0) {
    return { ok: false, erro: tipo === "reais" ? "Escreva o desconto em reais, como 10 ou 7,50." : "Escreva o desconto em %, como 20." };
  }
  if (tipo === "percentual" && valor >= 10000) return { ok: false, erro: "O desconto precisa ser menor que 100%." };
  if (tipo === "reais" && valor > 10_000_000) return { ok: false, erro: "Confira o desconto: parece alto demais." };
  const inicio = texto(valores.inicio) || hoje;
  const fim = texto(valores.fim);
  if (!dataValida(inicio)) return { ok: false, erro: "A data de início não é válida." };
  if (!dataValida(fim)) return { ok: false, erro: "Escolha até quando vale a promoção." };
  if (fim < inicio) return { ok: false, erro: "A promoção precisa terminar depois de começar." };
  return {
    ok: true,
    dados: {
      nome,
      tipo,
      valor,
      inicio,
      fim,
      porContaDaLoja: valores.quem === "loja",
      ativa: valores.ativa === undefined ? true : valores.ativa === "on" || valores.ativa === "sim" || valores.ativa === true,
    },
  };
}

/** Códigos de peças digitados ou colados: separados por linha, vírgula ou espaço, em maiúsculas e sem repetir. */
export function lerCodigos(valor: unknown): string[] {
  return [
    ...new Set(
      texto(valor)
        .toUpperCase()
        .split(/[\s,;]+/)
        .filter((c) => /^[A-Z0-9-]{2,20}$/.test(c)),
    ),
  ].slice(0, 500);
}

/**
 * Campos de desconto já preenchidos com as promoções das peças, para a
 * confirmação do pagamento e a venda direta: desconto por peça em R$, quem paga
 * (dividido ou loja) e o motivo com o nome das promoções.
 */
export function valoresDaPromocao(
  itens: readonly { pecaId: string; descontoCentavos: number; porContaDaLoja: boolean; nome: string }[],
): Record<string, string> {
  const valores: Record<string, string> = {};
  const nomes = new Set<string>();
  for (const i of itens) {
    if (i.descontoCentavos <= 0) continue;
    valores[`peca_desconto:${i.pecaId}`] = `${Math.floor(i.descontoCentavos / 100)},${String(i.descontoCentavos % 100).padStart(2, "0")}`;
    valores[`peca_tipo:${i.pecaId}`] = "reais";
    valores[`peca_quem:${i.pecaId}`] = i.porContaDaLoja ? "loja" : "dividido";
    nomes.add(i.nome);
  }
  if (nomes.size > 0) valores.desconto_motivo = `${nomes.size === 1 ? "Promoção" : "Promoções"}: ${[...nomes].join(", ")}`.slice(0, 200);
  return valores;
}
