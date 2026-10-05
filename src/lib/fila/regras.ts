// Fila de espera (CLAUDE.md, "Pedido, reserva e pagamento"): a cliente entra na
// fila de uma peça reservada e, se a reserva vencer ou o pedido for cancelado,
// a loja avisa pelo WhatsApp quem está na fila, na ordem de entrada. Funções puras, testadas.

import { formatarReais } from "../dinheiro";

/** Só dá para entrar na fila de uma peça reservada para outra cliente. */
export const podeEntrarNaFila = (status: string) => status === "reservada";

export type SituacaoNaFila = "aguardando" | "voltou" | "saiu";

/** Reservada: aguardando. De volta à venda: voltou. Vendida (ou fora da loja): saiu. */
export function situacaoNaFila(peca: { status: string; quantidade: number }): SituacaoNaFila {
  if (peca.status === "reservada") return "aguardando";
  if (peca.status === "publicada" && peca.quantidade > 0) return "voltou";
  return "saiu";
}

export const TEXTO_DA_SITUACAO: Record<SituacaoNaFila, string> = {
  aguardando: "Ainda reservada para outra cliente",
  voltou: "Voltou para a vitrine!",
  saiu: "Foi vendida para outra cliente",
};

/** Posição (1, 2, 3...) da cliente na fila da peça, pela ordem de entrada. */
export function posicaoNaFila(fila: { clienteId: string; criadoEm: Date }[], clienteId: string): number | null {
  const ordem = [...fila].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  const i = ordem.findIndex((f) => f.clienteId === clienteId);
  return i < 0 ? null : i + 1;
}

/** "1ª", "2ª"... */
export const ordinal = (n: number) => `${n}ª`;

/** Mensagem do WhatsApp para quem está na fila de uma peça que voltou. */
export function mensagemDaFila(dados: {
  nomeCliente: string;
  nomeCurto: string;
  peca: { nome: string; tamanho: string | null; precoCentavos: number; link: string };
}): string {
  const primeiroNome = dados.nomeCliente.trim().split(/\s+/)[0];
  const { peca } = dados;
  return [
    `Oi, ${primeiroNome}! Aqui é da ${dados.nomeCurto}. A peça que você estava esperando voltou para a vitrine:`,
    "",
    `• ${[peca.nome, peca.tamanho && `tam. ${peca.tamanho}`, formatarReais(peca.precoCentavos)].filter(Boolean).join(" · ")}`,
    `  ${peca.link}`,
    "",
    "Quem fechar o pedido primeiro leva. Se ainda quiser, corre!",
  ].join("\n");
}
