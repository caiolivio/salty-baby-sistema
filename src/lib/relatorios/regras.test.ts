import { describe, expect, it } from "vitest";
import {
  lerMes,
  mesAnterior,
  mesesComVendas,
  mesFechado,
  nomeDoMesDoRelatorio,
  periodoDoMes,
  relatorioDoMes,
  textoDoRelatorio,
} from "./regras";

const d = (t: string) => new Date(`${t}T00:00:00Z`);
const item = (id: string, data: string, pago: number, repasse: number, extra: { desconto?: number; quantidade?: number } = {}) => ({
  id,
  data: d(data),
  quantidade: extra.quantidade ?? 1,
  precoUnitarioCentavos: pago + (extra.desconto ?? 0),
  descontoCentavos: extra.desconto ?? 0,
  valorPagoCentavos: pago,
  repasseCentavos: repasse,
  repasseRecebido: false,
  peca: { codigo: `F44-0000${id}`, nome: `Peça ${id}` },
});

describe("meses", () => {
  it("lerMes aceita só aaaa-mm válido", () => {
    expect(lerMes("2026-09")).toBe("2026-09");
    expect(lerMes("2026-13")).toBeNull();
    expect(lerMes("2026-9")).toBeNull();
    expect(lerMes(undefined)).toBeNull();
  });

  it("mesAnterior vira o ano", () => {
    expect(mesAnterior("2026-10-03")).toBe("2026-09");
    expect(mesAnterior("2027-01")).toBe("2026-12");
  });

  it("o relatório do mês só fica pronto no dia 1 do mês seguinte", () => {
    expect(mesFechado("2026-09", "2026-09-30")).toBe(false);
    expect(mesFechado("2026-09", "2026-10-01")).toBe(true);
    expect(mesFechado("2026-10", "2026-10-03")).toBe(false);
  });

  it("nome e período do mês (fevereiro bissexto)", () => {
    expect(nomeDoMesDoRelatorio("2026-03")).toBe("março de 2026");
    expect(periodoDoMes("2028-02")).toMatchObject({ de: "2028-02-01", ate: "2028-02-29", por: "dia" });
  });
});

describe("relatorioDoMes", () => {
  const itens = [
    item("1", "2026-09-30", 2700, 1080),
    item("2", "2026-09-02", 4000, 1600, { desconto: 1000 }),
    item("3", "2026-10-01", 5000, 2000),
    item("4", "2026-08-15", 3000, 1200, { quantidade: 2 }),
  ];

  it("traz só as vendas do mês, em ordem de data, com os totais", () => {
    const r = relatorioDoMes(itens, "2026-09");
    expect(r.itens.map((i) => i.id)).toEqual(["2", "1"]);
    expect(r).toMatchObject({
      nome: "setembro de 2026",
      pecas: 2,
      vendidoCentavos: 6700,
      repasseCentavos: 2680,
      descontoCentavos: 1000,
      repasseMesAnteriorCentavos: 1200,
    });
  });

  it("o gráfico tem uma barra por semana do mês, inclusive as semanas sem venda", () => {
    const { barras } = relatorioDoMes(itens, "2026-09");
    expect(barras.map((b) => b.rotulo)).toEqual(["01 a 07/09", "08 a 14/09", "15 a 21/09", "22 a 28/09", "29 a 30/09"]);
    expect(barras[0]).toMatchObject({ repasseCentavos: 1600, pecas: 1 });
    expect(barras[4]).toMatchObject({ repasseCentavos: 1080, pecas: 1 });
    expect(barras.slice(1, 4).every((b) => b.pecas === 0)).toBe(true);
    expect(relatorioDoMes([], "2026-02").barras).toHaveLength(4);
  });

  it("mês sem vendas fica zerado", () => {
    expect(relatorioDoMes(itens, "2026-07")).toMatchObject({ pecas: 0, repasseCentavos: 0, itens: [] });
  });
});

describe("mesesComVendas", () => {
  it("lista só meses fechados com vendas, do mais recente para o mais antigo", () => {
    const itens = [
      item("1", "2026-09-30", 2700, 1080),
      item("2", "2026-09-02", 4000, 1600),
      item("3", "2026-10-01", 5000, 2000),
      item("4", "2026-08-15", 3000, 1200, { quantidade: 2 }),
    ];
    expect(mesesComVendas(itens, "2026-10-03")).toEqual([
      { mes: "2026-09", nome: "setembro de 2026", pecas: 2, repasseCentavos: 2680 },
      { mes: "2026-08", nome: "agosto de 2026", pecas: 2, repasseCentavos: 1200 },
    ]);
  });
});

describe("textoDoRelatorio", () => {
  it("monta a mensagem do WhatsApp com as vendas, os totais e o link", () => {
    const relatorio = relatorioDoMes(
      [item("1", "2026-09-30", 2700, 1080), item("2", "2026-09-02", 4000, 1600, { desconto: 1000 }), item("4", "2026-08-15", 3000, 1200)],
      "2026-09",
    );
    const texto = textoDoRelatorio(
      { loja: "Salty Baby", fornecedora: { nome: "Amanda Souza" }, relatorio },
      "https://app.exemplo/fornecedora/relatorios/2026-09",
    );
    expect(texto).toContain("*Salty Baby · Relatório de setembro de 2026*");
    expect(texto).toContain("Olá, Amanda! Em setembro de 2026 você vendeu 2 peças na Salty Baby.");
    expect(texto).toContain("Total vendido: R$ 67,00");
    expect(texto).toContain("Descontos: R$ 10,00");
    expect(texto).toContain("*Seu repasse: R$ 26,80*");
    expect(texto).toContain("No mês anterior, o seu repasse foi de R$ 12,00.");
    expect(texto).toContain("• F44-00002 · Peça 2: 02/09/2026, R$ 40,00 (seu repasse R$ 16,00)");
    expect(texto.indexOf("F44-00002")).toBeLessThan(texto.indexOf("F44-00001"));
    expect(texto).toContain("fica na sua área: https://app.exemplo/fornecedora/relatorios/2026-09");
  });

  it("sem desconto nem mês anterior, essas linhas não aparecem; uma peça no singular", () => {
    const relatorio = relatorioDoMes([item("1", "2026-09-30", 2700, 1080)], "2026-09");
    const texto = textoDoRelatorio({ loja: "Salty Baby", fornecedora: { nome: "Bia" }, relatorio });
    expect(texto).toContain("você vendeu 1 peça na");
    expect(texto).not.toContain("Descontos");
    expect(texto).not.toContain("mês anterior");
    expect(texto).not.toContain("sua área");
  });
});
