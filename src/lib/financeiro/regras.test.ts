import { describe, expect, it } from "vitest";
import { calcularTaxa, dozeMeses, lerDespesa, lerTaxas, lerValorEmReais, percentualNoCampo, resumoDoMes } from "./regras";

const d = (t: string) => new Date(`${t}T00:00:00Z`);

describe("taxas", () => {
  const taxas = { pix: 0, cartao: 350 };

  it("calcula a taxa sobre o que passou pela maquininha, arredondando", () => {
    expect(calcularTaxa({ forma: "cartao", totalCentavos: 5000 }, taxas)).toBe(175);
    expect(calcularTaxa({ forma: "cartao", totalCentavos: 3333 }, taxas)).toBe(117);
    expect(calcularTaxa({ forma: "pix", totalCentavos: 5000 }, { pix: 99 })).toBe(50);
  });

  it("a parte paga com o saldo da fornecedora não tem taxa", () => {
    expect(calcularTaxa({ forma: "cartao", totalCentavos: 5000, creditoCentavos: 2000 }, taxas)).toBe(105);
    expect(calcularTaxa({ forma: "cartao", totalCentavos: 5000, creditoCentavos: 6000 }, taxas)).toBe(0);
  });

  it("dinheiro, crédito da fornecedora e forma vazia não têm taxa", () => {
    expect(calcularTaxa({ forma: "dinheiro", totalCentavos: 5000 }, taxas)).toBe(0);
    expect(calcularTaxa({ forma: "credito_fornecedora", totalCentavos: 5000 }, taxas)).toBe(0);
    expect(calcularTaxa({ forma: null, totalCentavos: 5000 }, taxas)).toBe(0);
    expect(calcularTaxa({ forma: "cartao", totalCentavos: 5000 }, {})).toBe(0);
  });

  it("lê o formulário das taxas", () => {
    expect(lerTaxas({ pix: "", cartao: "3,5" })).toEqual({ ok: true, taxas: { pix: 0, cartao: 350 } });
    expect(lerTaxas({ pix: "0,99%", cartao: "4.98" })).toEqual({ ok: true, taxas: { pix: 99, cartao: 498 } });
    expect(lerTaxas({ pix: "abc", cartao: "3" })).toMatchObject({ ok: false });
    expect(lerTaxas({ pix: "0", cartao: "25" })).toMatchObject({ ok: false, erro: expect.stringContaining("Cartão") });
  });

  it("mostra o percentual no campo", () => {
    expect(percentualNoCampo(350)).toBe("3,5");
    expect(percentualNoCampo(498)).toBe("4,98");
    expect(percentualNoCampo(400)).toBe("4");
    expect(percentualNoCampo(0)).toBe("0");
    expect(percentualNoCampo(5)).toBe("0,05");
  });

  it("lê valores em reais", () => {
    expect(lerValorEmReais("12,50")).toBe(1250);
    expect(lerValorEmReais("R$ 1.200")).toBe(120000);
    expect(lerValorEmReais("-3")).toBeUndefined();
    expect(lerValorEmReais("doze")).toBeUndefined();
    expect(lerValorEmReais("")).toBeUndefined();
  });
});

describe("lerDespesa", () => {
  const hoje = "2026-10-05";
  it("aceita uma despesa completa", () => {
    expect(lerDespesa({ data: "2026-10-01", descricao: "  Sacolas   kraft ", categoria: "Embalagens", valor: "89,90" }, hoje)).toEqual({
      ok: true,
      dados: { data: "2026-10-01", descricao: "Sacolas kraft", categoria: "Embalagens", valorCentavos: 8990 },
    });
  });
  it("sem data, usa hoje", () => {
    expect(lerDespesa({ descricao: "Aluguel", categoria: "Aluguel e contas", valor: "800" }, hoje)).toMatchObject({
      ok: true,
      dados: { data: hoje },
    });
  });
  it("recusa o que falta ou está errado", () => {
    const base = { data: "2026-10-01", descricao: "x", categoria: "Outros", valor: "10" };
    expect(lerDespesa({ ...base, data: "2026-10-06" }, hoje)).toMatchObject({ ok: false, erro: expect.stringContaining("futuro") });
    expect(lerDespesa({ ...base, descricao: " " }, hoje)).toMatchObject({ ok: false });
    expect(lerDespesa({ ...base, categoria: "Festa" }, hoje)).toMatchObject({ ok: false, erro: expect.stringContaining("categoria") });
    expect(lerDespesa({ ...base, valor: "0" }, hoje)).toMatchObject({ ok: false, erro: expect.stringContaining("valor") });
    expect(lerDespesa({ ...base, valor: "dez" }, hoje)).toMatchObject({ ok: false });
  });
});

describe("resumoDoMes", () => {
  const vendas = [
    {
      // Peça consignada de R$ 50 (40%) e peça da loja de R$ 30 com custo de R$ 10, no cartão.
      data: d("2026-10-02"),
      totalCentavos: 8000,
      creditoCentavos: 0,
      taxaCentavos: 280,
      itens: [
        { tipo: "consignada", repasseCentavos: 2000, custoCentavos: null, lucroCentavos: 3000, quantidade: 1 },
        { tipo: "loja", repasseCentavos: 0, custoCentavos: 1000, lucroCentavos: 2000, quantidade: 1 },
      ],
    },
    {
      // Paga em parte com o saldo de uma fornecedora.
      data: d("2026-10-20"),
      totalCentavos: 4000,
      creditoCentavos: 1500,
      taxaCentavos: 0,
      itens: [{ tipo: "consignada", repasseCentavos: 1600, custoCentavos: null, lucroCentavos: 2400, quantidade: 1 }],
    },
    { data: d("2026-09-30"), totalCentavos: 9999, creditoCentavos: 0, taxaCentavos: 0, itens: [] },
  ];
  const despesas = [
    { data: d("2026-10-01"), categoria: "Embalagens", valorCentavos: 500 },
    { data: d("2026-10-10"), categoria: "Aluguel e contas", valorCentavos: 3000 },
    { data: d("2026-10-11"), categoria: "Embalagens", valorCentavos: 700 },
    { data: d("2026-11-01"), categoria: "Outros", valorCentavos: 100000 },
  ];

  it("calcula vendas, repasses, custo, taxas, despesas e o lucro real do mês", () => {
    expect(resumoDoMes(vendas, despesas, "2026-10")).toEqual({
      mes: "2026-10",
      vendas: 2,
      pecas: 3,
      vendidoCentavos: 12000,
      recebidoCentavos: 10500,
      repassesCentavos: 3600,
      custoCentavos: 1000,
      lucroBrutoCentavos: 7400,
      taxasCentavos: 280,
      despesasCentavos: 4200,
      lucroRealCentavos: 2920,
      despesasPorCategoria: [
        { categoria: "Aluguel e contas", valorCentavos: 3000 },
        { categoria: "Embalagens", valorCentavos: 1200 },
      ],
    });
  });

  it("mês com mais despesas que lucro fica negativo", () => {
    expect(resumoDoMes(vendas, despesas, "2026-11").lucroRealCentavos).toBe(-100000);
  });
});

it("dozeMeses vira o ano", () => {
  const meses = dozeMeses("2026-10");
  expect(meses).toHaveLength(12);
  expect(meses[0]).toBe("2025-11");
  expect(meses[11]).toBe("2026-10");
});
