// Etiqueta com QR code (CLAUDE.md, "Outros"): o QR abre a peça no painel.

/** Formatos de impressão: folha A4 comum ou impressora de etiquetas em rolo. */
export const FORMATOS = {
  a4: { nome: "Folha A4 (várias por folha)" },
  rolo: { nome: "Impressora de etiquetas (50 × 30 mm)" },
} as const;
export type Formato = keyof typeof FORMATOS;

export const LIMITE_ETIQUETAS = 200;

export function lerFormato(valor: unknown): Formato {
  return valor === "rolo" ? "rolo" : "a4";
}

/** Os ids chegam como ?ids=a,b ou ?ids=a&ids=b; repetidos e vazios saem. */
export function lerIds(valor: string | string[] | undefined): string[] {
  const lista = (Array.isArray(valor) ? valor : [valor ?? ""]).flatMap((v) => v.split(","));
  return [...new Set(lista.map((v) => v.trim()).filter(Boolean))].slice(0, LIMITE_ETIQUETAS);
}

/**
 * Endereço curto gravado no QR: quanto menor, mais fácil de ler numa etiqueta
 * pequena. Usa o código da peça, que nunca muda nem é reaproveitado.
 */
export function enderecoDaEtiqueta(origem: string, codigo: string): string {
  return `${origem.replace(/\/+$/, "")}/e/${encodeURIComponent(codigo.toLowerCase())}`;
}

/** Endereço do site a partir dos cabeçalhos da requisição (atrás do nginx do CloudPanel). */
export function origemDaRequisicao(cabecalhos: { get(nome: string): string | null }): string {
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "localhost";
  const protocolo = cabecalhos.get("x-forwarded-proto")?.split(",")[0].trim() ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocolo}://${host.split(",")[0].trim()}`;
}
