import { describe, expect, it } from "vitest";
import { abatimentoNoAcerto, formaComCredito, lerPedidoDeCredito, planoDeUso, saldoDeCredito } from "./credito";

const sem = (t: string) => t.replace(/ /g, " ");

describe("saldoDeCredito", () => {
  it("sem compras, o disponível é o repasse a receber", () => {
    expect(saldoDeCredito(10_000, [])).toEqual({
      aReceberCentavos: 10_000,
      usadoPendenteCentavos: 0,
      bonusCentavos: 0,
      disponivelCentavos: 10_000,
    });
  });
  it("desconta o já usado e soma o bônus", () => {
    const s = saldoDeCredito(10_000, [
      { repasseCentavos: -3_000, bonusCentavos: 0 },
      { repasseCentavos: 0, bonusCentavos: 500 },
    ]);
    expect(s).toEqual({
      aReceberCentavos: 7_000,
      usadoPendenteCentavos: 3_000,
      bonusCentavos: 500,
      disponivelCentavos: 7_500,
    });
  });
  it("o abatimento no acerto devolve o usado", () => {
    const s = saldoDeCredito(2_000, [
      { repasseCentavos: -3_000, bonusCentavos: 0 },
      { repasseCentavos: 3_000, bonusCentavos: 0 },
    ]);
    expect(s.usadoPendenteCentavos).toBe(0);
    expect(s.aReceberCentavos).toBe(2_000);
  });
  it("nunca fica negativo", () => {
    expect(saldoDeCredito(1_000, [{ repasseCentavos: -3_000, bonusCentavos: 0 }]).aReceberCentavos).toBe(0);
  });
});

describe("planoDeUso", () => {
  it("quem usa todo o saldo de R$ 100 ganha R$ 10 de bônus", () => {
    const r = planoDeUso(saldoDeCredito(10_000, []), 10_000);
    expect(r).toEqual({
      ok: true,
      uso: {
        bonusUsadoCentavos: 0,
        repasseUsadoCentavos: 10_000,
        bonusGanhoCentavos: 1_000,
      },
    });
  });
  it("R$ 99 de R$ 100 não ganha bônus", () => {
    const r = planoDeUso(saldoDeCredito(10_000, []), 9_900);
    expect(r.ok && r.uso.bonusGanhoCentavos).toBe(0);
  });
  it("usa o bônus primeiro", () => {
    const s = saldoDeCredito(10_000, [{ repasseCentavos: 0, bonusCentavos: 1_000 }]);
    const r = planoDeUso(s, 5_000);
    expect(r).toEqual({
      ok: true,
      uso: {
        bonusUsadoCentavos: 1_000,
        repasseUsadoCentavos: 4_000,
        bonusGanhoCentavos: 0,
      },
    });
  });
  it("gastar só o bônus não gera bônus novo", () => {
    const s = saldoDeCredito(0, [{ repasseCentavos: 0, bonusCentavos: 1_000 }]);
    const r = planoDeUso(s, 1_000);
    expect(r.ok && r.uso).toEqual({
      bonusUsadoCentavos: 1_000,
      repasseUsadoCentavos: 0,
      bonusGanhoCentavos: 0,
    });
  });
  it("bônus + todo o repasse ganha 10% do repasse usado", () => {
    const s = saldoDeCredito(5_000, [{ repasseCentavos: 0, bonusCentavos: 1_000 }]);
    const r = planoDeUso(s, 6_000);
    expect(r.ok && r.uso.bonusGanhoCentavos).toBe(500);
  });
  it("arredonda o bônus em centavos", () => {
    const r = planoDeUso(saldoDeCredito(1_005, []), 1_005);
    expect(r.ok && r.uso.bonusGanhoCentavos).toBe(101);
  });
  it("não deixa passar do disponível", () => {
    const r = planoDeUso(saldoDeCredito(1_000, []), 1_001);
    expect(r.ok).toBe(false);
    expect(!r.ok && sem(r.erro)).toBe("O saldo disponível é R$ 10,00.");
  });
  it("valor zero é recusado", () => {
    expect(planoDeUso(saldoDeCredito(1_000, []), 0).ok).toBe(false);
  });
});

describe("abatimentoNoAcerto", () => {
  it("abate o usado até o total do acerto", () => {
    expect(abatimentoNoAcerto(3_000, 10_000)).toBe(3_000);
    expect(abatimentoNoAcerto(12_000, 10_000)).toBe(10_000);
    expect(abatimentoNoAcerto(0, 10_000)).toBe(0);
  });
});

describe("lerPedidoDeCredito", () => {
  const fs = [{ id: "f1" }];
  it("sem fornecedora não usa saldo", () => {
    expect(lerPedidoDeCredito({ forma: "pix" }, fs)).toEqual({
      ok: true,
      credito: null,
    });
  });
  it("forma crédito exige fornecedora", () => {
    expect(lerPedidoDeCredito({ forma: "credito_fornecedora" }, fs).ok).toBe(false);
  });
  it("lê fornecedora e valor", () => {
    expect(lerPedidoDeCredito({ credito_fornecedora: "f1", credito_valor: "25,50" }, fs)).toEqual({
      ok: true,
      credito: { fornecedoraId: "f1", valorCentavos: 2_550 },
    });
  });
  it("recusa fornecedora desconhecida e valor inválido", () => {
    expect(lerPedidoDeCredito({ credito_fornecedora: "x", credito_valor: "10" }, fs).ok).toBe(false);
    expect(lerPedidoDeCredito({ credito_fornecedora: "f1", credito_valor: "abc" }, fs).ok).toBe(false);
    expect(lerPedidoDeCredito({ credito_fornecedora: "f1", credito_valor: "" }, fs).ok).toBe(false);
  });
});

describe("formaComCredito", () => {
  it("saldo pagando tudo vira crédito da fornecedora", () => {
    expect(formaComCredito("pix", 4_000, 4_000)).toEqual({
      ok: true,
      forma: "credito_fornecedora",
    });
  });
  it("saldo parcial mantém a forma do resto", () => {
    expect(formaComCredito("pix", 1_000, 4_000)).toEqual({
      ok: true,
      forma: "pix",
    });
  });
  it("saldo parcial com forma crédito pede a forma do resto", () => {
    const r = formaComCredito("credito_fornecedora", 1_000, 4_000);
    expect(!r.ok && sem(r.erro)).toBe("O saldo cobre R$ 10,00. Escolha como foram pagos os outros R$ 30,00.");
  });
  it("saldo maior que o total é recusado", () => {
    expect(formaComCredito("pix", 5_000, 4_000).ok).toBe(false);
  });
  it("sem saldo, segue a forma escolhida", () => {
    expect(formaComCredito("dinheiro", 0, 4_000)).toEqual({
      ok: true,
      forma: "dinheiro",
    });
  });
});
