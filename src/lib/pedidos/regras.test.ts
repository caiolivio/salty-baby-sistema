import { describe, expect, it } from "vitest";
import {
  fimDaReserva,
  incluirNoCarrinho,
  lerCarrinho,
  lerNomeCliente,
  LIMITE_CARRINHO,
  mensagemDoPedido,
  minutosRestantes,
  tirarDoCarrinho,
} from "./regras";

describe("carrinho", () => {
  it("lê o cookie sem repetir e sem aceitar lixo", () => {
    expect(lerCarrinho("a1,b2, a1,,<script>,c3")).toEqual(["a1", "b2", "c3"]);
    expect(lerCarrinho(undefined)).toEqual([]);
  });
  it("inclui e tira peças", () => {
    expect(incluirNoCarrinho(["a"], "b")).toEqual(["a", "b"]);
    expect(incluirNoCarrinho(["a"], "a")).toEqual(["a"]);
    expect(tirarDoCarrinho(["a", "b"], "a")).toEqual(["b"]);
  });
  it("tem limite de peças", () => {
    const muitos = Array.from({ length: 50 }, (_, i) => `p${i}`);
    expect(lerCarrinho(muitos.join(","))).toHaveLength(LIMITE_CARRINHO);
  });
});

describe("reserva de 15 minutos", () => {
  const agora = new Date("2026-09-30T20:00:00Z");
  it("vence 15 minutos depois de fechar o pedido", () => {
    expect(fimDaReserva(agora).toISOString()).toBe("2026-09-30T20:15:00.000Z");
  });
  it("conta os minutos que faltam", () => {
    const ate = fimDaReserva(agora);
    expect(minutosRestantes(ate, agora)).toBe(15);
    expect(minutosRestantes(ate, new Date("2026-09-30T20:14:30Z"))).toBe(1);
    expect(minutosRestantes(ate, new Date("2026-09-30T20:20:00Z"))).toBe(0);
  });
});

describe("pedido", () => {
  it("pede um nome de verdade", () => {
    expect(lerNomeCliente("  Ana   Paula ")).toBe("Ana Paula");
    expect(lerNomeCliente("A")).toBeUndefined();
    expect(lerNomeCliente(undefined)).toBeUndefined();
  });

  it("monta a mensagem do WhatsApp com todas as peças, links e total", () => {
    const texto = mensagemDoPedido(
      {
        numero: 12,
        nomeCliente: "Ana",
        total: "R$ 53,00",
        itens: [
          {
            codigo: "F45-00005",
            nome: "Tapa Fralda",
            tamanho: "RN",
            preco: "R$ 25,00",
          },
          {
            codigo: "SB-00001",
            nome: "Livro",
            tamanho: null,
            preco: "R$ 28,00",
          },
        ],
      },
      "https://teste.saltybaby.com.br/",
    );
    expect(texto).toBe(
      [
        "Olá! Sou Ana e fiz o pedido nº 12 no site:",
        "",
        "1. F45-00005 · Tapa Fralda · tam. RN · R$ 25,00",
        "https://teste.saltybaby.com.br/peca/f45-00005",
        "2. SB-00001 · Livro · R$ 28,00",
        "https://teste.saltybaby.com.br/peca/sb-00001",
        "",
        "Total: R$ 53,00",
        "As peças ficam reservadas por 15 minutos. Como faço o pagamento?",
      ].join("\n"),
    );
  });
});
