// Peças sugeridas na área do cliente, a partir do que ela comprou e marcou
// como favorito: tamanho, categorias e marcas. Funções puras, testadas.

import { lerTamanho, ordemDoTamanho, TAMANHOS, type Tamanho } from "../tamanhos";
import { estimarCriancas, mesesEntre, tamanhoParaIdade } from "./perfil";

const DIA = 86_400_000;

/** Peça que a cliente comprou ou favoritou. `data` é a data da compra (ou de quando favoritou). */
export type PecaDoHistorico = {
  tamanho: string | null;
  categorias: string[];
  marca: string | null;
  data: Date;
};

export type Preferencias = {
  tamanhos: Set<Tamanho>;
  categorias: Set<string>;
  marcas: Set<string>;
};

/** Pesos de cada coincidência. O tamanho pesa mais: peça que não serve não adianta. */
export const PESOS = { tamanho: 3, categoria: 2, marca: 2 } as const;

/** Compras dos últimos meses ainda indicam o tamanho de agora. */
const COMPRA_RECENTE_DIAS = 90;

const chave = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** O tamanho seguinte na ordem da vitrine (para a criança que está crescendo). */
export function proximoTamanho(tamanho: Tamanho): Tamanho | undefined {
  const i = ordemDoTamanho(tamanho);
  return TAMANHOS.slice(i + 1).find((t) => t.valor !== "Prematuro")?.valor;
}

/**
 * Junta o que a cliente gosta. Tamanhos: o de agora de cada criança (pela data
 * de nascimento cadastrada ou estimada pelas compras) e o próximo, os das
 * compras recentes e os dos favoritos. Categorias e marcas: as de tudo que ela
 * comprou ou favoritou.
 */
export function preferenciasDaCliente(dados: {
  compras: PecaDoHistorico[];
  favoritos: PecaDoHistorico[];
  nascimentos?: Date[];
  hoje: Date;
}): Preferencias {
  const tamanhos = new Set<Tamanho>();
  const crescer = (t: Tamanho) => {
    tamanhos.add(t);
    const proximo = proximoTamanho(t);
    if (proximo) tamanhos.add(proximo);
  };

  for (const nascimento of dados.nascimentos ?? []) crescer(tamanhoParaIdade(mesesEntre(nascimento, dados.hoje)));
  for (const crianca of estimarCriancas(dados.compras, dados.hoje)) crescer(crianca.tamanhoHoje);

  const recentes = dados.compras.filter((c) => dados.hoje.getTime() - c.data.getTime() <= COMPRA_RECENTE_DIAS * DIA);
  for (const p of [...recentes, ...dados.favoritos]) {
    const t = p.tamanho ? lerTamanho(p.tamanho) : undefined;
    if (t) tamanhos.add(t);
  }

  const todas = [...dados.compras, ...dados.favoritos];
  return {
    tamanhos,
    categorias: new Set(todas.flatMap((p) => p.categorias.map(chave)).filter(Boolean)),
    marcas: new Set(todas.map((p) => (p.marca ? chave(p.marca) : "")).filter(Boolean)),
  };
}

export type Candidata = {
  id: string;
  tamanho: string | null;
  categorias: string[];
  marca: string | null;
  dataEntrada: Date;
};

/** Pontos da peça: soma dos pesos de cada coisa que bate com o gosto da cliente. */
export function pontosDaPeca(peca: Candidata, gosto: Preferencias): number {
  const tamanho = peca.tamanho ? lerTamanho(peca.tamanho) : undefined;
  let pontos = 0;
  if (tamanho && gosto.tamanhos.has(tamanho)) pontos += PESOS.tamanho;
  if (peca.categorias.some((c) => gosto.categorias.has(chave(c)))) pontos += PESOS.categoria;
  if (peca.marca && gosto.marcas.has(chave(peca.marca))) pontos += PESOS.marca;
  return pontos;
}

/**
 * Escolhe as peças sugeridas: as que mais combinam com a cliente e, no empate,
 * as que chegaram por último. Ficam de fora as que ela já favoritou. Sem
 * histórico (cliente nova), mostra as novidades.
 */
export function escolherSugestoes<P extends Candidata>(
  candidatas: P[],
  gosto: Preferencias,
  ignorar: ReadonlySet<string>,
  limite = 12,
): { pecas: P[]; personalizadas: boolean } {
  const livres = candidatas.filter((p) => !ignorar.has(p.id));
  const maisNova = (a: P, b: P) => b.dataEntrada.getTime() - a.dataEntrada.getTime();
  const comPontos = livres
    .map((peca) => ({ peca, pontos: pontosDaPeca(peca, gosto) }))
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || maisNova(a.peca, b.peca))
    .map((x) => x.peca);
  if (comPontos.length > 0) return { pecas: comPontos.slice(0, limite), personalizadas: true };
  return { pecas: [...livres].sort(maisNova).slice(0, limite), personalizadas: false };
}
