import { describe, expect, it } from "vitest";
import { formatarReais } from "../dinheiro";
import { mensagemDaFila, ordinal, podeEntrarNaFila, posicaoNaFila, situacaoNaFila } from "./regras";

describe("fila de espera", () => {
  it("só entra na fila de peça reservada", () => {
    expect(podeEntrarNaFila("reservada")).toBe(true);
    expect(podeEntrarNaFila("publicada")).toBe(false);
    expect(podeEntrarNaFila("vendida")).toBe(false);
  });

  it("situação da peça para quem está na fila", () => {
    expect(situacaoNaFila({ status: "reservada", quantidade: 1 })).toBe("aguardando");
    expect(situacaoNaFila({ status: "publicada", quantidade: 1 })).toBe("voltou");
    expect(situacaoNaFila({ status: "publicada", quantidade: 0 })).toBe("saiu");
    expect(situacaoNaFila({ status: "vendida", quantidade: 0 })).toBe("saiu");
    expect(situacaoNaFila({ status: "devolvida", quantidade: 1 })).toBe("saiu");
  });

  it("posição pela ordem de entrada", () => {
    const fila = [
      { clienteId: "b", criadoEm: new Date("2026-10-05T12:05:00Z") },
      { clienteId: "a", criadoEm: new Date("2026-10-05T12:00:00Z") },
      { clienteId: "c", criadoEm: new Date("2026-10-05T12:10:00Z") },
    ];
    expect(posicaoNaFila(fila, "a")).toBe(1);
    expect(posicaoNaFila(fila, "b")).toBe(2);
    expect(posicaoNaFila(fila, "c")).toBe(3);
    expect(posicaoNaFila(fila, "x")).toBeNull();
    expect(ordinal(2)).toBe("2ª");
  });

  it("mensagem com a peça e o link", () => {
    expect(
      mensagemDaFila({
        nomeCliente: " Ana Paula ",
        nomeCurto: "Salty",
        peca: { nome: "Vestido", tamanho: "2 anos", precoCentavos: 4500, link: "https://x/peca/f01-00001" },
      }),
    ).toBe(
      [
        "Oi, Ana! Aqui é da Salty. A peça que você estava esperando voltou para a vitrine:",
        "",
        `• Vestido · tam. 2 anos · ${formatarReais(4500)}`,
        "  https://x/peca/f01-00001",
        "",
        "Quem fechar o pedido primeiro leva. Se ainda quiser, corre!",
      ].join("\n"),
    );
  });
});
