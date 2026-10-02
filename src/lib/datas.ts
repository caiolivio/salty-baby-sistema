// Datas no formato dd/mm/aaaa (CLAUDE.md). Datas sem hora (como a de entrada
// da peça) ficam guardadas à meia-noite UTC, então são lidas em UTC.
const soData = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });

export function formatarData(data: Date): string {
  return soData.format(data);
}

const soHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const dataEHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Hora no fuso de São Paulo: "14:35". */
export function formatarHora(momento: Date): string {
  return soHora.format(momento);
}

/** "30/09/2026 14:35" no fuso de São Paulo. */
export function formatarDataHora(momento: Date): string {
  return dataEHora.format(momento).replace(",", "");
}

/** Dia de um momento (data e hora) no fuso de São Paulo: "30/09/2026". */
export function formatarDia(momento: Date): string {
  return formatarDataHora(momento).slice(0, 10);
}
