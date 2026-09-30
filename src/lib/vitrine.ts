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
  busca?: string;
  pagina: number;
};

type Parametros = Record<string, string | string[] | undefined>;
const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function lerFiltros(parametros: Parametros): FiltrosVitrine {
  const tamanho = TAMANHOS.find((t) => t.valor === primeiro(parametros.tamanho))?.valor;
  const publico = PUBLICOS.find((p) => p.valor === primeiro(parametros.publico))?.valor;
  const categoria = primeiro(parametros.categoria)?.slice(0, 40);
  const busca = primeiro(parametros.q)?.slice(0, 60);
  const pagina = Math.min(1000, Math.max(1, Math.floor(Number(primeiro(parametros.pagina))) || 1));
  return { tamanho, publico, categoria, busca, pagina };
}

/** Endereço da vitrine com os filtros atuais e uma mudança. Mudar um filtro volta para a página 1. */
export function linkDaVitrine(atuais: FiltrosVitrine, mudanca: Partial<FiltrosVitrine> = {}): string {
  const f = { ...atuais, pagina: 1, ...mudanca };
  const busca = new URLSearchParams();
  if (f.tamanho) busca.set("tamanho", f.tamanho);
  if (f.publico) busca.set("publico", f.publico);
  if (f.categoria) busca.set("categoria", f.categoria);
  if (f.busca) busca.set("q", f.busca);
  if (f.pagina > 1) busca.set("pagina", String(f.pagina));
  const texto = busca.toString();
  return texto ? `/?${texto}` : "/";
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

/** WhatsApp da Salty Baby, (12) 98105-3623. A variável WHATSAPP_LOJA pode trocar. */
export const WHATSAPP_LOJA = "5512981053623";

/** Link do WhatsApp da loja com a mensagem pronta (número só com dígitos, com 55 e DDD). */
export function linkWhatsapp(numero: string | undefined, mensagem: string): string | undefined {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (digitos.length < 12) return undefined;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}
