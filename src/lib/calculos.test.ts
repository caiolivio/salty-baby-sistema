import { describe, expect, it } from "vitest";
import { calcularRepasse, calcularVenda, distribuirDesconto } from "./calculos";
import { formatarReais } from "./dinheiro";

const QUARENTA = 4000;

describe("calcularRepasse", () => {
  it("dá 40% de R$ 15 para a fornecedora (exemplo do Notion)", () => {
    expect(calcularRepasse(1500, QUARENTA)).toBe(600);
  });

  it("arredonda meio centavo para cima", () => {
    expect(calcularRepasse(1, 5000)).toBe(1);
    expect(calcularRepasse(3, 5000)).toBe(2);
  });

  it("recusa valores que não são centavos inteiros", () => {
    expect(() => calcularRepasse(15.5, QUARENTA)).toThrow();
    expect(() => calcularRepasse(1500, 40.5)).toThrow();
    expect(() => calcularRepasse(1500, 10_001)).toThrow();
    expect(() => calcularRepasse(-1, QUARENTA)).toThrow();
  });
});

describe("calcularVenda", () => {
  it("peça consignada: lucro é o valor pago menos o repasse", () => {
    expect(calcularVenda({ tipo: "consignada", valorPago: 1500, percentualRepasse: QUARENTA })).toEqual({
      valorPago: 1500,
      repasse: 600,
      lucro: 900,
    });
  });

  it("peça da loja: sem repasse, lucro é o valor pago menos o custo", () => {
    expect(calcularVenda({ tipo: "loja", valorPago: 2500, custo: 1000 })).toEqual({
      valorPago: 2500,
      repasse: 0,
      lucro: 1500,
    });
  });

  it("o repasse é calculado depois do desconto (R$ 95 vendida por R$ 45)", () => {
    expect(calcularVenda({ tipo: "consignada", valorPago: 4500, percentualRepasse: QUARENTA }).repasse).toBe(1800);
  });
});

describe("distribuirDesconto", () => {
  it("segue o exemplo do CLAUDE.md: R$ 30 + R$ 10 com cupom de R$ 4", () => {
    const pagos = distribuirDesconto([3000, 1000], 400);
    expect(pagos).toEqual([2700, 900]);
    expect(pagos.map((p) => calcularRepasse(p, QUARENTA))).toEqual([1080, 360]);
  });

  it("a soma dos descontos é sempre exatamente o cupom", () => {
    const precos = [1000, 1000, 1000];
    const pagos = distribuirDesconto(precos, 100);
    expect(pagos.reduce((a, b) => a + b, 0)).toBe(3000 - 100);
    // empate nos restos: o centavo que sobra vai para a primeira peça
    expect(pagos).toEqual([966, 967, 967]);
  });

  it("não altera nada sem desconto e recusa desconto maior que o total", () => {
    expect(distribuirDesconto([1500, 2500], 0)).toEqual([1500, 2500]);
    expect(() => distribuirDesconto([1000], 1001)).toThrow();
    expect(() => distribuirDesconto([1000], -1)).toThrow();
  });
});

describe("formatarReais", () => {
  it("usa o formato R$ 1.234,56", () => {
    expect(formatarReais(123456)).toBe("R$ 1.234,56");
    expect(formatarReais(900)).toBe("R$ 9,00");
  });
});
