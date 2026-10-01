// Nomes dos status da peça como aparecem na tela.
export const NOMES_SITUACAO: Record<string, string> = {
  rascunho: "Rascunho",
  publicada: "À venda",
  reservada: "Reservada",
  vendida: "Vendida",
  na_sacolinha: "Na sacolinha",
  enviada: "Enviada",
  retirada: "Retirada",
  devolvida: "Devolvida",
  doada: "Doada",
  baixa: "Baixa",
};

/** Nome do status, contando o "Não listado" (à venda só pelo link). */
export function nomeDoStatus(status: string, naoListada = false): string {
  if (status === "publicada" && naoListada) return "Não listado";
  return NOMES_SITUACAO[status] ?? status;
}
