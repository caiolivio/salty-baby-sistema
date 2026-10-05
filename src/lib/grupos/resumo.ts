// Resumo semanal por grupo (CLAUDE.md, "Grupos de WhatsApp"): um post por grupo
// com as peças que entraram à venda no site na semana, pelas regras do grupo
// sugerido. A postagem é manual (copiar e colar). Funções puras, testadas.

import { gruposSugeridos, LIMITE_DIVULGACAO } from "./regras";

export const DIAS_DO_RESUMO = 7;

const dia = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (data: string, dias: number) => {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return dia(d);
};
const brasileira = (data: string) => data.split("-").reverse().join("/");

export type SemanaDoResumo = { de: string; ate: string; anterior: string; seguinte: string | null; rotulo: string };

/**
 * Os 7 dias do resumo. Sem data escolhida, os últimos 7 dias até hoje. A
 * semana nunca passa de hoje.
 */
export function semanaDoResumo(escolhida: unknown, hoje: string): SemanaDoResumo {
  const valida = typeof escolhida === "string" && /^\d{4}-\d{2}-\d{2}$/.test(escolhida) && !Number.isNaN(Date.parse(escolhida));
  const padrao = somarDias(hoje, -(DIAS_DO_RESUMO - 1));
  const de = valida && escolhida <= padrao ? escolhida : padrao;
  const ate = somarDias(de, DIAS_DO_RESUMO - 1);
  const seguinte = somarDias(de, DIAS_DO_RESUMO);
  return {
    de,
    ate,
    anterior: somarDias(de, -DIAS_DO_RESUMO),
    seguinte: seguinte <= padrao ? seguinte : null,
    rotulo: `${brasileira(de)} a ${brasileira(ate)}`,
  };
}

export type PecaDoResumo = {
  id: string;
  genero: string | null;
  categorias: string[];
  emPromocao: boolean;
  publicadaEm: Date | null;
};

/** A peça entrou à venda no site dentro da semana. */
export const entrouNaSemana = (peca: { publicadaEm: Date | null }, semana: { de: string; ate: string }) =>
  peca.publicadaEm !== null && dia(peca.publicadaEm) >= semana.de && dia(peca.publicadaEm) <= semana.ate;

/**
 * Peças da semana para cada grupo, pelas regras do grupo sugerido, das mais
 * novas para as mais antigas, até 30 por grupo (o WhatsApp manda no máximo 30
 * fotos de uma vez). Grupos sem nenhuma peça também aparecem, vazios.
 */
export function resumoPorGrupo<P extends PecaDoResumo, G extends { id: string; papel: string | null; ativo: boolean }>(
  pecas: P[],
  grupos: G[],
  semana: { de: string; ate: string },
): { grupo: G; pecas: P[]; total: number }[] {
  const daSemana = pecas
    .filter((p) => entrouNaSemana(p, semana))
    .sort((a, b) => b.publicadaEm!.getTime() - a.publicadaEm!.getTime());
  return grupos
    .filter((g) => g.ativo)
    .map((grupo) => {
      const doGrupo = daSemana.filter((p) => gruposSugeridos(p, [grupo]).length > 0);
      return { grupo, pecas: doGrupo.slice(0, LIMITE_DIVULGACAO), total: doGrupo.length };
    });
}

/** Título e texto do post do resumo, para a loja mudar se quiser. */
export function aberturaDoResumo(dados: { nomeCurto: string; quantidade: number; promocao: boolean }): {
  titulo: string;
  texto: string;
} {
  const pecas = dados.quantidade === 1 ? "1 peça nova" : `${dados.quantidade} peças novas`;
  return {
    titulo: dados.promocao ? `Liquida da semana na ${dados.nomeCurto} 🐳` : `Novidades da semana na ${dados.nomeCurto} 🐳`,
    texto: dados.promocao
      ? `Esta semana entraram ${dados.quantidade === 1 ? "1 peça" : `${dados.quantidade} peças`} em promoção. Para comprar, é só tocar no link da peça. Quem fechar o pedido primeiro leva!`
      : `Chegaram ${pecas} esta semana. Para comprar, é só tocar no link da peça. Quem fechar o pedido primeiro leva!`,
  };
}
