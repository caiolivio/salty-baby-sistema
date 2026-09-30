// Resumo da cliente para marketing e pós-venda: ticket médio, marcas preferidas
// e a idade das crianças, estimada pelos tamanhos comprados. Funções puras, testadas.

import { lerTamanho, TAMANHOS, type Tamanho } from "../tamanhos";

const DIA = 86_400_000;
const MES = 30.4375 * DIA;

/** Idade (em meses) em que cada tamanho começa a servir. O último vai até 20 anos. */
const INICIO_EM_MESES: Record<Tamanho, number> = {
  Prematuro: 0,
  RN: 0,
  P: 3,
  M: 6,
  G: 9,
  "1 ano": 12,
  "18 meses": 18,
  "2 anos": 24,
  "3 anos": 36,
  "4 anos": 48,
  "5 anos": 60,
  "6 anos": 72,
  "7 anos": 84,
  "8 anos": 96,
  "9 anos": 108,
  "10 anos": 120,
  "12 anos": 144,
  "14 anos": 168,
  "16 anos": 192,
  "18 anos": 216,
};

/** Faixa de idade (em meses) de cada tamanho: do começo dele até o começo do próximo. */
export function faixaDoTamanho(tamanho: string): { de: number; ate: number } | undefined {
  const t = lerTamanho(tamanho);
  if (!t) return undefined;
  if (t === "Prematuro") return { de: 0, ate: 1 };
  const i = TAMANHOS.findIndex((x) => x.valor === t);
  const proximo = TAMANHOS.slice(i + 1).find((x) => x.valor !== "Prematuro");
  return { de: INICIO_EM_MESES[t], ate: proximo ? INICIO_EM_MESES[proximo.valor] : 240 };
}

/** Tamanho que serve numa idade (em meses). */
export function tamanhoParaIdade(meses: number): Tamanho {
  let atual: Tamanho = "RN";
  for (const t of TAMANHOS) {
    if (t.valor !== "Prematuro" && INICIO_EM_MESES[t.valor] <= meses) atual = t.valor;
  }
  return atual;
}

export function mesesEntre(de: Date, ate: Date): number {
  return Math.max(0, (ate.getTime() - de.getTime()) / MES);
}

/** 3 → "3 meses"; 15 → "1 ano e 3 meses"; 48 → "4 anos". */
export function formatarIdade(meses: number): string {
  const m = Math.floor(meses);
  const anos = Math.floor(m / 12);
  const resto = m % 12;
  const txtMeses = resto === 1 ? "1 mês" : `${resto} meses`;
  if (anos === 0) return m <= 0 ? "recém-nascido" : txtMeses;
  const txtAnos = anos === 1 ? "1 ano" : `${anos} anos`;
  return resto === 0 || anos >= 6 ? txtAnos : `${txtAnos} e ${txtMeses}`;
}

/** Nascimentos estimados a menos de 8 meses um do outro contam como a mesma criança. */
const MESES_MESMA_CRIANCA = 8;

export type PecaComprada = { data: Date; tamanho: string | null };

export type CriancaEstimada = {
  /** Nascimento aproximado (a data mais provável). */
  nascimento: Date;
  /** Peças que apontam para esta criança. */
  pecas: number;
  primeiraCompra: Date;
  ultimaCompra: Date;
  /** Idade estimada na última compra e hoje. */
  idadeNaUltimaCompra: number;
  idadeHoje: number;
  tamanhoHoje: Tamanho;
};

/**
 * Estima quantas crianças a cliente compra e a idade de cada uma. Cada peça com
 * tamanho indica um nascimento aproximado (data da compra − meio da faixa do
 * tamanho). Nascimentos estimados a menos de 8 meses do primeiro de um grupo são
 * tratados como a mesma criança. É uma estimativa: serve para sugerir tamanhos e campanhas, não é dado real.
 */
export function estimarCriancas(pecas: PecaComprada[], hoje: Date): CriancaEstimada[] {
  const pontos = pecas
    .map((p) => {
      const faixa = p.tamanho ? faixaDoTamanho(p.tamanho) : undefined;
      if (!faixa) return undefined;
      const meio = (faixa.de + faixa.ate) / 2;
      return { data: p.data, nascimento: p.data.getTime() - meio * MES };
    })
    .filter((p) => p !== undefined)
    .sort((a, b) => a.nascimento - b.nascimento);

  const grupos: (typeof pontos)[] = [];
  for (const p of pontos) {
    const grupo = grupos.at(-1);
    if (grupo && p.nascimento - grupo[0].nascimento < MESES_MESMA_CRIANCA * MES) grupo.push(p);
    else grupos.push([p]);
  }

  return grupos
    .map((g) => {
      const nascimentos = g.map((p) => p.nascimento).sort((a, b) => a - b);
      const nascimento = new Date(nascimentos[Math.floor((nascimentos.length - 1) / 2)]);
      const datas = g.map((p) => p.data.getTime());
      const ultima = new Date(Math.max(...datas));
      const idadeHoje = mesesEntre(nascimento, hoje);
      return {
        nascimento,
        pecas: g.length,
        primeiraCompra: new Date(Math.min(...datas)),
        ultimaCompra: ultima,
        idadeNaUltimaCompra: mesesEntre(nascimento, ultima),
        idadeHoje,
        tamanhoHoje: tamanhoParaIdade(idadeHoje),
      };
    })
    .sort((a, b) => b.pecas - a.pecas);
}

/** Marcas mais compradas, da mais frequente para a menos. */
export function marcasPreferidas(marcas: (string | null)[], limite = 5): { marca: string; pecas: number }[] {
  const contagem = new Map<string, { marca: string; pecas: number }>();
  for (const m of marcas) {
    const nome = m?.trim();
    if (!nome) continue;
    const chave = nome.toLocaleLowerCase("pt-BR");
    const atual = contagem.get(chave) ?? { marca: nome, pecas: 0 };
    atual.pecas += 1;
    contagem.set(chave, atual);
  }
  return [...contagem.values()].sort((a, b) => b.pecas - a.pecas || a.marca.localeCompare(b.marca)).slice(0, limite);
}

/** Total gasto por mês (aaaa-mm), dos últimos `meses` meses até o mês de hoje, inclusive os vazios. */
export function gastoPorMes(
  vendas: { data: Date; totalCentavos: number }[],
  hoje: Date,
  meses = 12,
): { mes: string; totalCentavos: number; compras: number }[] {
  const lista: { mes: string; totalCentavos: number; compras: number }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
    lista.push({ mes: d.toISOString().slice(0, 7), totalCentavos: 0, compras: 0 });
  }
  for (const v of vendas) {
    const item = lista.find((l) => l.mes === v.data.toISOString().slice(0, 7));
    if (item) {
      item.totalCentavos += v.totalCentavos;
      item.compras += 1;
    }
  }
  return lista;
}
