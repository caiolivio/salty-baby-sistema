// Datas no formato dd/mm/aaaa (CLAUDE.md). Datas sem hora (como a de entrada
// da peça) ficam guardadas à meia-noite UTC, então são lidas em UTC.
const soData = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });

export function formatarData(data: Date): string {
  return soData.format(data);
}
