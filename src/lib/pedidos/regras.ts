// Carrinho e pedido pelo WhatsApp (CLAUDE.md, "Pedido, reserva e pagamento").
// Funções puras, testadas.

import { enderecoDaPeca } from "../vitrine";

/** Minutos que as peças ficam reservadas depois de "Fechar pedido" (padrão; a loja configura). */
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

export function fimDaReserva(agora: Date, minutos = MINUTOS_DE_RESERVA): Date {
  return new Date(agora.getTime() + minutos * 60_000);
}

/** Minutos que faltam (arredondado para cima; 0 quando venceu). */
export function minutosRestantes(ate: Date, agora: Date): number {
  return Math.max(0, Math.ceil((ate.getTime() - agora.getTime()) / 60_000));
}

export function lerNomeCliente(valor: unknown): string | undefined {
  const nome = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
  return nome.length >= 2 && nome.length <= 120 ? nome : undefined;
}

/**
 * WhatsApp da cliente: só os dígitos, com DDD (10 ou 11 dígitos). Aceita o 55
 * do Brasil na frente e tira. Devolve undefined se não parecer um telefone.
 */
export function lerTelefoneCliente(valor: unknown): string | undefined {
  let digitos = typeof valor === "string" ? valor.replace(/\D/g, "") : "";
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) digitos = digitos.slice(2);
  return digitos.length === 10 || digitos.length === 11 ? digitos : undefined;
}

/** (11) 98765-4321 */
export function formatarTelefone(digitos: string): string {
  if (!/^\d{10,11}$/.test(digitos)) return digitos;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, -4)}-${digitos.slice(-4)}`;
}

/** Link para a loja chamar a cliente no WhatsApp. */
export function linkWhatsappCliente(digitos: string): string {
  return `https://wa.me/55${digitos}`;
}

/** Busca de peça pelo código novo ou antigo, sem diferença de maiúsculas. */
export function lerCodigoPeca(valor: unknown): string | undefined {
  const codigo = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  return /^[A-Z0-9-]{2,20}$/.test(codigo) ? codigo : undefined;
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
    /** Código da fornecedora que quer pagar com o saldo dela. */
    saldoDe?: string | null;
  },
  origem: string,
  minutosReserva = MINUTOS_DE_RESERVA,
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
    ...(pedido.saldoDe ? [`Quero pagar com o meu saldo de fornecedora (${pedido.saldoDe}).`] : []),
    `As peças ficam reservadas por ${minutosReserva} minutos. Como faço o pagamento?`,
  ].join("\n");
}
