// Gênero da peça em caixinhas (pedido do Caio, 05/11/2026): Menina, Menino e
// Unissex podem ser marcados juntos. No banco ficam dois campos:
// - `genero`: o principal, usado no grupo sugerido, nos cupons e nos filtros
//   Menina e Menino (feminino, masculino, ou unissex quando vale para os dois);
// - `unissex`: a peça também aparece no filtro Unissex.
// Exemplo: "Menina + Unissex" é genero feminino + unissex: aparece em Menina e
// em Unissex, não em Menino, e vai para o grupo Meninas. Só "Unissex" continua
// aparecendo nos três filtros. Funções puras, testadas.

export const CAIXAS_DE_GENERO = [
  { valor: "feminino", nome: "Menina" },
  { valor: "masculino", nome: "Menino" },
  { valor: "unissex", nome: "Unissex" },
] as const;

export type GeneroPrincipal = "feminino" | "masculino" | "unissex";
export type GenerosDaPeca = { genero: GeneroPrincipal | null; unissex: boolean };

/** Caixinhas marcadas (valores "feminino", "masculino", "unissex") para os dois campos. */
export function lerGeneros(valores: readonly unknown[]): GenerosDaPeca {
  const marcados = new Set(valores.filter((v): v is string => typeof v === "string"));
  const menina = marcados.has("feminino");
  const menino = marcados.has("masculino");
  const unissex = marcados.has("unissex");
  const genero: GeneroPrincipal | null =
    menina && !menino ? "feminino" : menino && !menina ? "masculino" : menina && menino ? "unissex" : unissex ? "unissex" : null;
  return { genero, unissex };
}

/**
 * Caixinhas que aparecem marcadas para os dois campos. As três marcadas e só
 * "Unissex" funcionam igual (a peça aparece em tudo), e voltam como só "Unissex".
 */
export function generosMarcados(genero: string | null | undefined, unissex: boolean): string[] {
  if (genero === "feminino") return unissex ? ["feminino", "unissex"] : ["feminino"];
  if (genero === "masculino") return unissex ? ["masculino", "unissex"] : ["masculino"];
  if (genero === "unissex") return unissex ? ["unissex"] : ["feminino", "masculino"];
  return [];
}

/** "Menina + Unissex", para listas, histórico e planilhas. Vazio sem gênero. */
export function nomeDosGeneros(genero: string | null | undefined, unissex: boolean): string {
  const nomes = generosMarcados(genero, unissex).map((g) => CAIXAS_DE_GENERO.find((c) => c.valor === g)!.nome);
  return nomes.join(" + ");
}
