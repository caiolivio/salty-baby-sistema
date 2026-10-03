import { describe, expect, it } from "vitest";
import { fimDoMesAnterior, lerAcerto, marcadoDeInicio, nomeDoMes, resumirAPagar, textoDoComprovante } from "./regras";

const d = (t: string) => new Date(`${t}T00:00:00Z`);

describe("fimDoMesAnterior", () => {
  it("é o último dia do mês passado, inclusive na virada do ano e em fevereiro", () => {
    expect(fimDoMesAnterior("2026-10-01")).toBe("2026-09-30");
    expect(fimDoMesAnterior("2026-10-31")).toBe("2026-09-30");
    expect(fimDoMesAnterior("2027-01-15")).toBe("2026-12-31");
    expect(fimDoMesAnterior("2028-03-02")).toBe("2028-02-29");
  });

  it("nomeDoMes", () => {
    expect(nomeDoMes("2026-09-30")).toBe("setembro de 2026");
  });
});

describe("resumirAPagar", () => {
  const itens = [
    { id: "a", data: d("2026-08-20"), repasseCentavos: 1000, quantidade: 1 },
    { id: "b", data: d("2026-09-30"), repasseCentavos: 600, quantidade: 1 },
    { id: "c", data: d("2026-10-01"), repasseCentavos: 400, quantidade: 2 },
  ];

  it("separa o mês fechado (até 30/09) do mês atual", () => {
    expect(resumirAPagar(itens, "2026-10-02")).toEqual({
      fechadoCentavos: 1600,
      pecasFechadas: 2,
      mesAtualCentavos: 400,
      pecasMesAtual: 2,
      totalCentavos: 2000,
    });
  });

  it("no começo do mês seguinte, tudo vira mês fechado", () => {
    expect(resumirAPagar(itens, "2026-11-01").fechadoCentavos).toBe(2000);
  });

  it("vem marcado no formulário só o que é do mês fechado", () => {
    expect(itens.map((i) => marcadoDeInicio(i, "2026-10-02"))).toEqual([true, true, false]);
  });
});

describe("lerAcerto", () => {
  const pendentes = [{ id: "a" }, { id: "b" }];
  const hoje = "2026-10-02";

  it("aceita só vendas pendentes desta fornecedora, sem repetir", () => {
    const r = lerAcerto({ itens: ["a", "a", "x", "b"], data: "2026-10-01", forma: "pix", observacao: "  Pix  da conta  " }, pendentes, hoje);
    expect(r).toEqual({ ok: true, dados: { itemIds: ["a", "b"], data: "2026-10-01", forma: "pix", observacao: "Pix da conta" } });
  });

  it("sem data, usa hoje; sem observação, fica vazia", () => {
    const r = lerAcerto({ itens: ["a"], forma: "dinheiro" }, pendentes, hoje);
    expect(r).toEqual({ ok: true, dados: { itemIds: ["a"], data: hoje, forma: "dinheiro", observacao: null } });
  });

  it("recusa nenhuma venda marcada, data no futuro ou inválida e forma desconhecida", () => {
    expect(lerAcerto({ itens: ["x"], forma: "pix" }, pendentes, hoje)).toMatchObject({ ok: false, erro: expect.stringContaining("Marque") });
    expect(lerAcerto({ itens: ["a"], data: "2026-10-03", forma: "pix" }, pendentes, hoje)).toMatchObject({ ok: false, erro: expect.stringContaining("futuro") });
    expect(lerAcerto({ itens: ["a"], data: "02/10/2026", forma: "pix" }, pendentes, hoje)).toMatchObject({ ok: false, erro: expect.stringContaining("não é válida") });
    expect(lerAcerto({ itens: ["a"], forma: "cheque" }, pendentes, hoje)).toMatchObject({ ok: false, erro: expect.stringContaining("forma") });
    expect(lerAcerto({ itens: ["a"], forma: "pix", observacao: "x".repeat(201) }, pendentes, hoje)).toMatchObject({ ok: false });
  });
});

describe("textoDoComprovante", () => {
  it("traz número, total, forma, cada peça e o link da área", () => {
    const texto = textoDoComprovante(
      {
        loja: "Salty Baby",
        numero: 7,
        fornecedora: { codigo: "F44", nome: "Maria da Silva" },
        data: d("2026-10-01"),
        forma: "pix",
        totalCentavos: 2200,
        observacao: null,
        itens: [
          { codigo: "F44-00001", nome: "Vestido", data: d("2026-09-10"), valorPagoCentavos: 3000, repasseCentavos: 1200 },
          { codigo: "F44-00002", nome: "Body", data: d("2026-09-20"), valorPagoCentavos: 2500, repasseCentavos: 1000 },
        ],
      },
      "https://app.saltybaby.com.br/fornecedora/pagamentos",
    ).replace(/\u00a0/g, " ");
    expect(texto).toContain("*Salty Baby · Comprovante de repasse nº 7*");
    expect(texto).toContain("Olá, Maria! Pagamos o seu repasse de R$ 22,00 em 01/10/2026 (Pix).");
    expect(texto).toContain("• F44-00001 · Vestido: vendida em 10/09/2026 por R$ 30,00, seu repasse R$ 12,00");
    expect(texto).toContain("Total vendido: R$ 55,00");
    expect(texto).toContain("*Total do repasse: R$ 22,00*");
    expect(texto).toContain("https://app.saltybaby.com.br/fornecedora/pagamentos");
    expect(texto).not.toContain("Obs.");
  });
});
