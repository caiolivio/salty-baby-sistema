// Busca e filtros da lista de peças do painel (/painel/pecas). Funções puras, testadas.

import { NOMES_SITUACAO } from "../situacoes";
import { TAMANHOS, type Tamanho } from "../tamanhos";

/** Opções do filtro Status: os status do cadastro, com "Não listado" separado de "À venda". */
export const STATUS_DO_FILTRO = [
  "publicada",
  "nao_listada",
  "rascunho",
  "reservada",
  "vendida",
  "na_sacolinha",
  "enviada",
  "retirada",
  "devolucao_pedida",
  "devolvida",
  "doada",
  "baixa",
] as const;
export type StatusDoFiltro = (typeof STATUS_DO_FILTRO)[number];

export const nomeDoStatusDoFiltro = (s: StatusDoFiltro) => (s === "nao_listada" ? "Não listado" : NOMES_SITUACAO[s]);

export type BuscaDePecas = {
  busca?: string;
  categoria?: string;
  tamanho?: Tamanho;
  status?: StatusDoFiltro;
  pagina: number;
};

type Parametros = Record<string, string | string[] | undefined>;
const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function lerBuscaDePecas(parametros: Parametros): BuscaDePecas {
  return {
    busca: primeiro(parametros.q)?.slice(0, 80),
    categoria: primeiro(parametros.categoria)?.slice(0, 40),
    tamanho: TAMANHOS.find((t) => t.valor === primeiro(parametros.tamanho))?.valor,
    status: STATUS_DO_FILTRO.find((s) => s === primeiro(parametros.status)),
    pagina: Math.min(10000, Math.max(1, Math.floor(Number(primeiro(parametros.pagina))) || 1)),
  };
}

/** Algum filtro ou texto escolhido? */
export const filtrandoPecas = (f: BuscaDePecas) => Boolean(f.busca || f.categoria || f.tamanho || f.status);

/** Endereço da lista com a busca atual e uma mudança. Mudar um filtro volta para a página 1. */
export function linkDaBuscaDePecas(atual: BuscaDePecas, mudanca: Partial<BuscaDePecas> = {}): string {
  const f = { ...atual, pagina: 1, ...mudanca };
  const busca = new URLSearchParams();
  if (f.busca) busca.set("q", f.busca);
  if (f.categoria) busca.set("categoria", f.categoria);
  if (f.tamanho) busca.set("tamanho", f.tamanho);
  if (f.status) busca.set("status", f.status);
  if (f.pagina > 1) busca.set("pagina", String(f.pagina));
  const texto = busca.toString();
  return texto ? `/painel/pecas?${texto}` : "/painel/pecas";
}

/**
 * Condição do banco para a busca (no formato do Prisma). O texto procura no código novo ou
 * antigo, no nome, na marca e no código da fornecedora; os filtros somam com ele.
 */
export function condicaoDaBusca(f: BuscaDePecas) {
  const status =
    f.status === "nao_listada"
      ? { status: "publicada" as const, naoListada: true }
      : f.status === "publicada"
        ? { status: "publicada" as const, naoListada: false }
        : f.status
          ? { status: f.status }
          : {};
  return {
    ...status,
    ...(f.tamanho && { tamanho: f.tamanho }),
    ...(f.categoria && { categorias: { some: { categoriaId: f.categoria } } }),
    ...(f.busca && {
      OR: [
        { codigo: { contains: f.busca } },
        { codigoAntigo: { contains: f.busca } },
        { nome: { contains: f.busca } },
        { marca: { contains: f.busca } },
        { fornecedora: { codigo: f.busca.toUpperCase() } },
      ],
    }),
  };
}

/** Frase da contagem: "12 peças em Calçados, tamanho 2, à venda, para "nike"". */
export function resumoDaBusca(total: number, f: BuscaDePecas, nomeDaCategoria?: string): string {
  const partes = [
    nomeDaCategoria && `em ${nomeDaCategoria}`,
    f.tamanho && `tamanho ${f.tamanho}`,
    f.status && `status ${nomeDoStatusDoFiltro(f.status)}`,
    f.busca && `com "${f.busca}"`,
  ].filter(Boolean);
  const pecas = total === 1 ? "1 peça" : `${total} peças`;
  return partes.length ? `${pecas} ${partes.join(", ")}.` : `${pecas}.`;
}
