// Carrinho e pedido pelo WhatsApp (CLAUDE.md, "Pedido, reserva e pagamento").
// Funções puras, testadas.

import { enderecoDaPeca } from "../vitrine";

/** Minutos que as peças ficam reservadas depois de "Fechar pedido". */
export const MINUTOS_DE_RESERVA = 15;
/** Máximo de peças num carrinho (evita um cookie enorme). */
export const LIMITE_CARRINHO = 40;
export const COOKIE_CARRINHO = "carrinho";

/** O carrinho fica num cookie com os ids das peças separados por vírgula. */
export function lerCarrinho(valor: string | undefined): string[] {
  const ids = (valor ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => /^[a-z0-9_]{1,40}$/i.test(v));
  return [...new Set(ids)].slice(0, LIMITE_CARRINHO);
}

export function incluirNoCarrinho(ids: string[], id: string): string[] {
  return lerCarrinho([...ids, id].join(","));
}

export function tirarDoCarrinho(ids: string[], id: string): string[] {
  return ids.filter((x) => x !== id);
}

export function fimDaReserva(agora: Date): Date {
  return new Date(agora.getTime() + MINUTOS_DE_RESERVA * 60_000);
}

/** Minutos que faltam (arredondado para cima; 0 quando venceu). */
export function minutosRestantes(ate: Date, agora: Date): number {
  return Math.max(0, Math.ceil((ate.getTime() - agora.getTime()) / 60_000));
}

export function lerNomeCliente(valor: unknown): string | undefined {
  const nome = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
  return nome.length >= 2 && nome.length <= 120 ? nome : undefined;
}

export type ItemDaMensagem = {
  codigo: string;
  nome: string;
  tamanho: string | null;
  preco: string;
};

/** Mensagem única do WhatsApp com todas as peças do pedido. */
export function mensagemDoPedido(
  pedido: {
    numero: number;
    nomeCliente: string;
    total: string;
    itens: ItemDaMensagem[];
  },
  origem: string,
): string {
  const base = origem.replace(/\/+$/, "");
  const linhas = pedido.itens.map((p, i) => {
    const detalhes = [p.codigo, p.nome, p.tamanho && `tam. ${p.tamanho}`, p.preco].filter(Boolean).join(" · ");
    return `${i + 1}. ${detalhes}\n${base}${enderecoDaPeca(p.codigo)}`;
  });
  return [
    `Olá! Sou ${pedido.nomeCliente} e fiz o pedido nº ${pedido.numero} no site:`,
    "",
    ...linhas,
    "",
    `Total: ${pedido.total}`,
    `As peças ficam reservadas por ${MINUTOS_DE_RESERVA} minutos. Como faço o pagamento?`,
  ].join("\n");
}
