// Rascunho do cadastro de peça (pedido do Caio, 05/11/2026): o que foi
// digitado fica guardado no próprio aparelho, para não perder o cadastro se a
// página fechar (no celular, abrir a câmera às vezes recarrega a página).
// Funções puras, testadas; a gravação fica em src/componentes/rascunho-local.ts.

/** Campos do formulário: nome do campo -> valores (vários para caixinhas). */
export type CamposDoRascunho = Record<string, string[]>;

/** Campos que não entram no rascunho (o id é da página; arquivos vão à parte). */
const FORA = new Set(["id", "fotos", "desafio", "resposta"]);

/** Lê os campos do formulário, sem arquivos. */
export function camposDoFormulario(entradas: Iterable<[string, FormDataEntryValue]>): CamposDoRascunho {
  const campos: CamposDoRascunho = {};
  for (const [nome, valor] of entradas) {
    if (FORA.has(nome) || nome.startsWith("$") || typeof valor !== "string") continue;
    (campos[nome] ??= []).push(valor);
  }
  return campos;
}

const normal = (c: CamposDoRascunho) =>
  JSON.stringify(
    Object.keys(c)
      .sort()
      .filter((k) => c[k].some((v) => v.trim() !== ""))
      .map((k) => [k, [...c[k]].sort()]),
  );

/** O rascunho tem algo diferente do que a página já mostra? */
export function rascunhoDiferente(rascunho: CamposDoRascunho, inicial: CamposDoRascunho, fotos = 0): boolean {
  return fotos > 0 || normal(rascunho) !== normal(inicial);
}

/** Chave do rascunho: um para a peça nova e um para cada peça em edição. */
export const chaveDoRascunho = (id?: string) => `peca:${id || "nova"}`;

/** Rascunho velho demais é esquecido. */
export const DIAS_DO_RASCUNHO = 14;
export const rascunhoVencido = (salvoEm: number, agora: number) => agora - salvoEm > DIAS_DO_RASCUNHO * 86_400_000;

/** "às 14h32" (hoje) ou "em 03/11 às 14h32", no horário de Brasília. */
export function quandoFoiGuardado(salvoEm: number, agora: number): string {
  const fmt = (ms: number, op: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...op }).format(new Date(ms));
  const hora = fmt(salvoEm, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).replace(":", "h");
  const dia = fmt(salvoEm, { day: "2-digit", month: "2-digit" });
  return dia === fmt(agora, { day: "2-digit", month: "2-digit" }) ? `às ${hora}` : `em ${dia} às ${hora}`;
}
