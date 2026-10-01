import { describe, expect, it } from "vitest";
import { lerPeriodo } from "../clientes/perfil";
import { calcularSaldos, devolucaoDisponivelEm, situacaoDaDevolucao, vendasNoPeriodo } from "./saldos";

const d = (t: string) => new Date(`${t}T00:00:00Z`);

describe("devolução depois de 6 meses", () => {
  it("conta 6 meses de calendário a partir da entrada", () => {
    expect(devolucaoDisponivelEm(d("2026-04-10"))).toBe("2026-10-10");
    expect(devolucaoDisponivelEm(d("2026-08-31"))).toBe("2027-02-28");
    expect(devolucaoDisponivelEm(d("2027-08-31"))).toBe("2028-02-29");
  });
  it("libera só as peças à venda ou em rascunho, a partir da data", () => {
    expect(situacaoDaDevolucao({ status: "publicada", dataEntrada: d("2026-04-01") }, "2026-10-01")).toEqual({ tipo: "pode" });
    expect(situacaoDaDevolucao({ status: "rascunho", dataEntrada: d("2026-04-02") }, "2026-10-01")).toEqual({
      tipo: "a-partir-de",
      data: "2026-10-02",
    });
    expect(situacaoDaDevolucao({ status: "vendida", dataEntrada: d("2025-01-01") }, "2026-10-01")).toEqual({ tipo: "nao-se-aplica" });
    expect(situacaoDaDevolucao({ status: "reservada", dataEntrada: d("2025-01-01") }, "2026-10-01")).toEqual({ tipo: "nao-se-aplica" });
    expect(situacaoDaDevolucao({ status: "devolucao_pedida", dataEntrada: d("2025-01-01") }, "2026-10-01")).toEqual({ tipo: "pedida" });
  });
});

describe("saldos", () => {
  const itens = [
    { data: d("2026-09-28"), valorPagoCentavos: 2700, repasseCentavos: 1080, repasseRecebido: false, quantidade: 1 },
    { data: d("2026-08-15"), valorPagoCentavos: 900, repasseCentavos: 360, repasseRecebido: true, quantidade: 1 },
    { data: d("2025-12-01"), valorPagoCentavos: 1500, repasseCentavos: 600, repasseRecebido: false, quantidade: 1 },
  ];
  it("a receber é tudo o que não foi pago, desde sempre; acumulado soma tudo", () => {
    const s = calcularSaldos(
      [
        { status: "publicada", precoCentavos: 3000, quantidade: 1, percentualRepasse: 4000 },
        { status: "reservada", precoCentavos: 1000, quantidade: 2, percentualRepasse: 5000 },
        { status: "rascunho", precoCentavos: 5000, quantidade: 1, percentualRepasse: 4000 },
        { status: "vendida", precoCentavos: 2700, quantidade: 0, percentualRepasse: 4000 },
      ],
      itens,
    );
    expect(s).toEqual({
      aReceberCentavos: 1680,
      aVendaCentavos: 1200 + 1000,
      acumuladoCentavos: 2040,
      recebidoCentavos: 360,
      pecasAVenda: 3,
      pecasVendidas: 3,
    });
  });
  it("vendas da semana, do mês e do ano, com as barras do gráfico", () => {
    const semana = vendasNoPeriodo(itens, lerPeriodo({ periodo: "semanal" }, "2026-10-01"));
    expect(semana.barras).toHaveLength(7);
    expect(semana.pecas).toBe(1);
    expect(semana.repasseCentavos).toBe(1080);
    expect(semana.barras.find((b) => b.chave === "2026-09-28")?.repasseCentavos).toBe(1080);

    const ano = vendasNoPeriodo(itens, lerPeriodo({ periodo: "anual" }, "2026-10-01"));
    expect(ano.pecas).toBe(3);
    expect(ano.vendidoCentavos).toBe(5100);
    expect(ano.barras.find((b) => b.chave === "2025-12")?.pecas).toBe(1);

    const agosto = vendasNoPeriodo(itens, lerPeriodo({ periodo: "mensal", mes: "2026-08" }, "2026-10-01"));
    expect(agosto.pecas).toBe(1);
    expect(agosto.barras).toHaveLength(31);
  });
});
