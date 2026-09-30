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

/** Texto pronto para colar no grupo, com o link marcado. */
export function textoDoPost(
  peca: {
    codigo: string;
    nome: string;
    tamanho: string | null;
    marca: string | null;
    conservacao: string | null;
    medidas: string | null;
    preco: string;
  },
  link: string,
): string {
  const detalhes = [
    peca.tamanho && `Tam. ${peca.tamanho}`,
    peca.marca,
    peca.conservacao,
    peca.medidas && `Medidas: ${peca.medidas}`,
  ].filter(Boolean);
  return [
    `✨ ${peca.nome}`,
    detalhes.length > 0 ? detalhes.join(" · ") : null,
    `💰 ${peca.preco}`,
    `Código ${peca.codigo}`,
    "",
    `Para comprar, é só clicar: ${link}`,
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}
