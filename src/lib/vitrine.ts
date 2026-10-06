// Regras da vitrine (o site que as clientes veem). Funções puras, testadas.

import { TAMANHOS, type Tamanho } from "./tamanhos";

export const POR_PAGINA_VITRINE = 24;

/** "Menina" mostra roupas femininas e unissex; "Menino", masculinas e unissex. */
export const PUBLICOS = [
  { valor: "menina", nome: "Menina", generos: ["feminino", "unissex"] },
  { valor: "menino", nome: "Menino", generos: ["masculino", "unissex"] },
] as const;
export type Publico = (typeof PUBLICOS)[number]["valor"];

export type FiltrosVitrine = {
  tamanho?: Tamanho;
  publico?: Publico;
  categoria?: string;
  /** Marca como aparece na lista (as grafias parecidas entram juntas, ver `marcasDaVitrine`). */
  marca?: string;
  busca?: string;
  /** Só peças em promoção. */
  promocao?: boolean;
  pagina: number;
};

type Parametros = Record<string, string | string[] | undefined>;
const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function lerFiltros(parametros: Parametros): FiltrosVitrine {
  const tamanho = TAMANHOS.find((t) => t.valor === primeiro(parametros.tamanho))?.valor;
  const publico = PUBLICOS.find((p) => p.valor === primeiro(parametros.publico))?.valor;
  const categoria = primeiro(parametros.categoria)?.slice(0, 40);
  const marca = primeiro(parametros.marca)?.replace(/\s+/g, " ").slice(0, 80);
  const busca = primeiro(parametros.q)?.slice(0, 60);
  const pagina = Math.min(1000, Math.max(1, Math.floor(Number(primeiro(parametros.pagina))) || 1));
  const promocao = primeiro(parametros.promocao) === "1" || undefined;
  return { tamanho, publico, categoria, marca, busca, promocao, pagina };
}

/** Endereço da vitrine com os filtros atuais e uma mudança. Mudar um filtro volta para a página 1. */
export function linkDaVitrine(atuais: FiltrosVitrine, mudanca: Partial<FiltrosVitrine> = {}): string {
  const f = { ...atuais, pagina: 1, ...mudanca };
  const busca = new URLSearchParams();
  if (f.tamanho) busca.set("tamanho", f.tamanho);
  if (f.publico) busca.set("publico", f.publico);
  if (f.categoria) busca.set("categoria", f.categoria);
  if (f.marca) busca.set("marca", f.marca);
  if (f.busca) busca.set("q", f.busca);
  if (f.promocao) busca.set("promocao", "1");
  if (f.pagina > 1) busca.set("pagina", String(f.pagina));
  const texto = busca.toString();
  return texto ? `/?${texto}` : "/";
}

/** Marca sem acento, maiúsculas e espaços a mais, para comparar "Zara" com " zará ". */
export const marcaComparavel = (marca: string) =>
  marca
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export type MarcaDaVitrine = {
  /** Nome mostrado: a grafia mais usada entre as peças. */
  nome: string;
  /** Todas as grafias guardadas nas peças ("Zara", "ZARA", "zará"), para buscar no banco. */
  grafias: string[];
};

/** Marcas das peças à venda, juntando as grafias parecidas, em ordem alfabética. */
export function marcasDaVitrine(marcas: Iterable<string | null>): MarcaDaVitrine[] {
  const grupos = new Map<string, Map<string, number>>();
  for (const marca of marcas) {
    const limpa = marca?.replace(/\s+/g, " ").trim();
    if (!limpa) continue;
    const chave = marcaComparavel(limpa);
    const grafias = grupos.get(chave) ?? new Map<string, number>();
    grafias.set(marca!, (grafias.get(marca!) ?? 0) + 1);
    grupos.set(chave, grafias);
  }
  return [...grupos.values()]
    .map((grafias) => {
      const nomes = [...grafias].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
      return { nome: nomes[0][0].replace(/\s+/g, " ").trim(), grafias: nomes.map(([g]) => g) };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

/** A marca escolhida no filtro, achada pela comparação sem acento e maiúsculas. */
export function marcaEscolhida(marcas: MarcaDaVitrine[], escolhida?: string): MarcaDaVitrine | undefined {
  if (!escolhida) return undefined;
  const chave = marcaComparavel(escolhida);
  return marcas.find((m) => marcaComparavel(m.nome) === chave);
}

/** Gêneros que entram no filtro escolhido (vazio = todos). */
export function generosDoPublico(publico?: Publico): string[] {
  return publico ? [...PUBLICOS.find((p) => p.valor === publico)!.generos] : [];
}

/** Endereço público de uma peça: /peca/f06-00001. */
export function enderecoDaPeca(codigo: string): string {
  return `/peca/${codigo.toLowerCase()}`;
}

/** Tamanhos que têm peça à venda, na ordem oficial. */
export function tamanhosDisponiveis(existentes: Iterable<string | null>): Tamanho[] {
  const tem = new Set(existentes);
  return TAMANHOS.filter((t) => tem.has(t.valor)).map((t) => t.valor);
}

/** Link do WhatsApp da loja com a mensagem pronta (número só com dígitos, com 55 e DDD). */
export function linkWhatsapp(numero: string | undefined, mensagem: string): string | undefined {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (digitos.length < 12) return undefined;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

/** Mensagem pronta do WhatsApp para uma peça, com o link dela no site. */
export function mensagemDaPeca(
  peca: { codigo: string; nome: string; tamanho: string | null; preco: string },
  origem: string,
  grupo?: string,
): string {
  const partes = [peca.codigo, peca.nome, peca.tamanho && `tam. ${peca.tamanho}`, peca.preco].filter(Boolean).join(" · ");
  const vi = grupo ? `\n(Vi no grupo ${grupo})` : "";
  return `Olá! Tenho interesse nesta peça: ${partes}\n${origem.replace(/\/+$/, "")}${enderecoDaPeca(peca.codigo)}${vi}`;
}

/** Link do WhatsApp sem número: a cliente escolhe para quem mandar. */
export function linkCompartilharWhatsapp(mensagem: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
}

/** Mensagem para a cliente mandar a peça a uma amiga pelo WhatsApp. */
export function mensagemParaAmiga(
  peca: { codigo: string; nome: string; tamanho: string | null; preco: string },
  origem: string,
  nomeLoja: string,
): string {
  const partes = [peca.nome, peca.tamanho && `tam. ${peca.tamanho}`, peca.preco].filter(Boolean).join(" · ");
  return `Vi isso aqui na ${nomeLoja} e lembrei de você! 💛\n${partes}\n${origem.replace(/\/+$/, "")}${enderecoDaPeca(peca.codigo)}`;
}
