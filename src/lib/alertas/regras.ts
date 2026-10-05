// Alertas "me avise quando chegar" (CLAUDE.md, "Clientes"): a cliente escolhe
// tamanho, público (menina/menino), categoria e/ou marca, e a loja avisa pelo
// WhatsApp quando chega peça que combina. Funções puras, testadas.

import { formatarReais } from "../dinheiro";
import { TAMANHOS, type Tamanho } from "../tamanhos";
import { PUBLICOS, type Publico } from "../vitrine";

/** Quantos alertas cada cliente pode ter ao mesmo tempo. */
export const MAXIMO_DE_ALERTAS = 10;
/** Quantas peças, no máximo, vão em uma mensagem. */
export const PECAS_POR_AVISO = 10;

export type Alerta = {
  tamanho: string | null;
  publico: string | null;
  categoriaId: string | null;
  marca: string | null;
};

export type PecaParaAlerta = {
  tamanho: string | null;
  genero: string | null;
  marca: string | null;
  categorias: readonly string[];
};

/** Marca sem acento, maiúsculas e espaços a mais, para comparar "Zara" com " zará ". */
export const marcaComparavel = (marca: string) =>
  marca
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** A peça combina com tudo o que o alerta pede? Peça sem gênero vale para menina e menino (igual à vitrine). */
export function pecaAtende(alerta: Alerta, peca: PecaParaAlerta): boolean {
  if (alerta.tamanho && peca.tamanho !== alerta.tamanho) return false;
  if (alerta.publico) {
    const generos: readonly string[] = PUBLICOS.find((p) => p.valor === alerta.publico)?.generos ?? [];
    if (peca.genero && !generos.includes(peca.genero)) return false;
  }
  if (alerta.categoriaId && !peca.categorias.includes(alerta.categoriaId)) return false;
  if (alerta.marca && (!peca.marca || marcaComparavel(peca.marca) !== marcaComparavel(alerta.marca))) return false;
  return true;
}

export type AlertaLido = { tamanho: Tamanho | null; publico: Publico | null; categoriaId: string | null; marca: string | null };

/** Formulário do alerta: pelo menos uma escolha. A categoria é conferida no banco. */
export function lerAlerta(valores: Record<string, string | undefined>): { ok: true; alerta: AlertaLido } | { ok: false; erro: string } {
  const texto = (campo: string) => (valores[campo] ?? "").trim();
  const tamanho = TAMANHOS.find((t) => t.valor === texto("tamanho"))?.valor ?? null;
  const publico = PUBLICOS.find((p) => p.valor === texto("publico"))?.valor ?? null;
  const categoriaId = texto("categoria").slice(0, 40) || null;
  const marca = texto("marca").replace(/\s+/g, " ").slice(0, 80) || null;
  if (texto("tamanho") && !tamanho) return { ok: false, erro: "Escolha um tamanho da lista." };
  if (!tamanho && !publico && !categoriaId && !marca) {
    return { ok: false, erro: "Escolha pelo menos uma coisa: tamanho, menina ou menino, categoria ou marca." };
  }
  return { ok: true, alerta: { tamanho, publico, categoriaId, marca } };
}

/** Os dois alertas pedem a mesma coisa? (para não criar repetido) */
export function mesmoAlerta(a: Alerta, b: Alerta): boolean {
  return (
    a.tamanho === b.tamanho &&
    a.publico === b.publico &&
    a.categoriaId === b.categoriaId &&
    (a.marca ? marcaComparavel(a.marca) : null) === (b.marca ? marcaComparavel(b.marca) : null)
  );
}

/** "Tamanho 2 anos · Menina · Vestidos · Marca Zara" */
export function descricaoDoAlerta(alerta: Alerta, nomeDaCategoria?: string | null): string {
  return [
    alerta.tamanho && `Tamanho ${alerta.tamanho}`,
    alerta.publico && PUBLICOS.find((p) => p.valor === alerta.publico)?.nome,
    alerta.categoriaId && (nomeDaCategoria ?? "Categoria"),
    alerta.marca && `Marca ${alerta.marca}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export type PecaDoAviso = { nome: string; tamanho: string | null; precoCentavos: number; link: string };

/** Mensagem do WhatsApp com as peças que chegaram (até PECAS_POR_AVISO) e o link para ver os alertas. */
export function mensagemDoAlerta(dados: {
  nomeCliente: string;
  nomeCurto: string;
  pecas: PecaDoAviso[];
  linkAlertas: string;
}): string {
  const primeiroNome = dados.nomeCliente.trim().split(/\s+/)[0];
  const mostradas = dados.pecas.slice(0, PECAS_POR_AVISO);
  const resto = dados.pecas.length - mostradas.length;
  const umaSo = dados.pecas.length === 1;
  return [
    `Oi, ${primeiroNome}! Aqui é da ${dados.nomeCurto}. ${umaSo ? "Chegou uma peça" : "Chegaram peças"} do jeito que você pediu para avisar:`,
    "",
    ...mostradas.flatMap((p) => [
      `• ${[p.nome, p.tamanho && `tam. ${p.tamanho}`, formatarReais(p.precoCentavos)].filter(Boolean).join(" · ")}`,
      `  ${p.link}`,
    ]),
    ...(resto > 0 ? ["", `E mais ${resto === 1 ? "1 peça" : `${resto} peças`}: ${dados.linkAlertas}`] : []),
    "",
    "Cada peça é única. Se gostar, é só tocar no link e fechar o pedido!",
    `Para mudar os seus avisos: ${dados.linkAlertas}`,
  ].join("\n");
}
