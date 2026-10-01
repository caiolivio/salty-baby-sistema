// Grupos de WhatsApp: grupo sugerido para cada peça e texto pronto do post
// (CLAUDE.md, "Grupos de WhatsApp").

export const PAPEIS_GRUPO = [
  { valor: "masculino", nome: "Peças de menino" },
  { valor: "feminino", nome: "Peças de menina" },
  { valor: "promocao", nome: "Peças em promoção" },
  { valor: "acessorios", nome: "Acessórios" },
  { valor: "calcados", nome: "Calçados" },
] as const;
export type PapelGrupo = (typeof PAPEIS_GRUPO)[number]["valor"];

/** Parâmetro do link do post que marca o grupo de origem (/peca/f06-00001?g=meninas). */
export const PARAMETRO_GRUPO = "g";
/** Cookie que guarda o grupo de origem até a cliente fechar o pedido. */
export const COOKIE_GRUPO = "grupo_origem";

const semAcento = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** "Liquida Salty" → "liquida-salty". Vira a marca do grupo no link. */
export function codigoDoGrupo(nome: string): string {
  return semAcento(nome)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Marca do grupo vinda do link: só letras minúsculas, números e hífen. */
export function lerCodigoGrupo(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const codigo = valor.trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(codigo) ? codigo : undefined;
}

export function lerNomeGrupo(texto: unknown): { ok: true; nome: string } | { ok: false; erro: string } {
  const nome = typeof texto === "string" ? texto.trim().replace(/\s+/g, " ") : "";
  if (nome.length < 2) return { ok: false, erro: "Escreva o nome do grupo." };
  if (nome.length > 60) return { ok: false, erro: "Use no máximo 60 caracteres." };
  if (!codigoDoGrupo(nome)) return { ok: false, erro: "Use letras ou números no nome do grupo." };
  return { ok: true, nome };
}

export function lerPapelGrupo(valor: unknown): PapelGrupo | null {
  return PAPEIS_GRUPO.find((p) => p.valor === valor)?.valor ?? null;
}

type PecaParaGrupo = { genero: string | null; categorias: string[]; emPromocao?: boolean };

/**
 * Regras do grupo sugerido: acessório vai para Acessórios e calçado para
 * Calçados; peça em promoção vai para a Liquida; nos outros casos vale o
 * gênero, e unissex (ou sem gênero) vai para os dois.
 */
export function papeisSugeridos(peca: PecaParaGrupo): PapelGrupo[] {
  const categorias = peca.categorias.map(semAcento);
  const papeis: PapelGrupo[] = [];
  if (categorias.some((c) => c.startsWith("acessorio"))) papeis.push("acessorios");
  if (categorias.some((c) => c.startsWith("calcado"))) papeis.push("calcados");
  if (papeis.length > 0) return papeis;
  if (peca.emPromocao) return ["promocao"];
  if (peca.genero === "masculino") return ["masculino"];
  if (peca.genero === "feminino") return ["feminino"];
  return ["masculino", "feminino"];
}

/** Grupos ativos que atendem as regras da peça, na ordem da lista. */
export function gruposSugeridos<G extends { papel: string | null; ativo: boolean }>(peca: PecaParaGrupo, grupos: G[]): G[] {
  const papeis: string[] = papeisSugeridos(peca);
  return grupos.filter((g) => g.ativo && g.papel && papeis.includes(g.papel));
}

/** Link da peça no site com a marca do grupo. */
export function linkDoPost(origem: string, codigoPeca: string, codigoGrupo: string): string {
  return `${origem.replace(/\/+$/, "")}/peca/${codigoPeca.toLowerCase()}?${PARAMETRO_GRUPO}=${encodeURIComponent(codigoGrupo)}`;
}

/** Dados de uma peça para o post, já formatados para mostrar. */
export type PecaDoPost = {
  codigo: string;
  nome: string;
  /** Descrição do cadastro; não é obrigatória. */
  descricao: string | null;
  categorias: string[];
  tamanho: string | null;
  preco: string;
  marca: string | null;
  nota: number | null;
};

/**
 * Texto de uma peça, uma informação por linha, na ordem pedida pelo Caio:
 * nome (em negrito, com asteriscos do WhatsApp), texto, categoria, tamanho,
 * preço, marca e nota. Por último o link da peça, marcado pelo grupo.
 */
export function textoDoPost(peca: PecaDoPost, link: string): string {
  return [
    `*${peca.nome.replace(/\*/g, "")}*`,
    peca.descricao?.trim() || null,
    peca.categorias.length > 0 ? `Categoria: ${peca.categorias.join(", ")}` : null,
    peca.tamanho && `Tamanho: ${peca.tamanho}`,
    `Preço: ${peca.preco}`,
    peca.marca && `Marca: ${peca.marca}`,
    peca.nota !== null && `Nota: ${peca.nota}`,
    `Para comprar: ${link}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Link da peça no site, com a marca do grupo quando há grupo. */
export function linkDaPeca(origem: string, codigoPeca: string, codigoGrupo?: string): string {
  return codigoGrupo ? linkDoPost(origem, codigoPeca, codigoGrupo) : `${origem.replace(/\/+$/, "")}/peca/${codigoPeca.toLowerCase()}`;
}

/** Abertura de uma divulgação: título em negrito e o texto livre. */
export function aberturaDaDivulgacao(titulo: string, texto: string): string {
  const limpo = titulo.trim().replace(/\*/g, "");
  return [limpo && `*${limpo}*`, texto.trim()].filter(Boolean).join("\n\n");
}

/** Limite de peças numa divulgação (o WhatsApp manda no máximo 30 fotos de uma vez). */
export const LIMITE_DIVULGACAO = 30;
/** Cookie com as peças escolhidas para a divulgação no painel. */
export const COOKIE_DIVULGACAO = "divulgacao_painel";

/** Grupo sugerido para uma lista de peças: o que as regras indicam para mais peças. */
export function grupoMaisSugerido<G extends { id: string; papel: string | null; ativo: boolean }>(
  pecas: PecaParaGrupo[],
  grupos: G[],
): G | undefined {
  const votos = new Map<string, number>();
  for (const peca of pecas) for (const g of gruposSugeridos(peca, grupos)) votos.set(g.id, (votos.get(g.id) ?? 0) + 1);
  let melhor: G | undefined;
  for (const g of grupos) if ((votos.get(g.id) ?? 0) > (melhor ? votos.get(melhor.id)! : 0)) melhor = g;
  return melhor;
}

/**
 * Texto de uma divulgação com várias peças: a abertura (título e texto) e,
 * separada por uma linha em branco, cada peça no formato do post de uma peça.
 */
export function textoDaDivulgacao(dados: {
  titulo: string;
  texto: string;
  pecas: PecaDoPost[];
  origem: string;
  codigoGrupo?: string;
}): string {
  const itens = dados.pecas.map((p) => textoDoPost(p, linkDaPeca(dados.origem, p.codigo, dados.codigoGrupo)));
  return [aberturaDaDivulgacao(dados.titulo, dados.texto), ...itens].filter(Boolean).join("\n\n");
}
