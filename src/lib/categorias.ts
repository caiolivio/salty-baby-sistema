// Nome de categoria digitado no painel: sem espaços sobrando, de 2 a 60 letras.
export function lerNomeCategoria(texto: unknown): { ok: true; nome: string } | { ok: false; erro: string } {
  const nome = typeof texto === "string" ? texto.trim().replace(/\s+/g, " ") : "";
  if (nome.length < 2) return { ok: false, erro: "Escreva o nome da categoria." };
  if (nome.length > 60) return { ok: false, erro: "Use no máximo 60 caracteres." };
  return { ok: true, nome };
}
