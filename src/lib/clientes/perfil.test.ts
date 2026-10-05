import { describe, expect, it } from "vitest";
import { agruparGasto, estimarCriancas, faixaDoTamanho, formatarIdade, lerPeriodo, marcasPreferidas, tamanhoDaCrianca, tamanhoParaIdade } from "./perfil";

const d = (t: string) => new Date(`${t}T00:00:00Z`);

describe("idade pelo tamanho", () => {
  it("dá a faixa de cada tamanho", () => {
    expect(faixaDoTamanho("RN")).toEqual({ de: 0, ate: 3 });
    expect(faixaDoTamanho("G")).toEqual({ de: 9, ate: 12 });
    expect(faixaDoTamanho("18 meses")).toEqual({ de: 18, ate: 24 });
    expect(faixaDoTamanho("2 anos")).toEqual({ de: 24, ate: 36 });
    expect(faixaDoTamanho("10 anos")).toEqual({ de: 120, ate: 144 });
    expect(faixaDoTamanho("Prematuro")).toEqual({ de: 0, ate: 1 });
    expect(faixaDoTamanho("único")).toBeUndefined();
  });

  it("sugere o tamanho pela idade", () => {
    expect(tamanhoParaIdade(1)).toBe("RN");
    expect(tamanhoParaIdade(7)).toBe("M");
    expect(tamanhoParaIdade(20)).toBe("18 meses");
    expect(tamanhoParaIdade(40)).toBe("3 anos");
    expect(tamanhoParaIdade(130)).toBe("10 anos");
  });

  it("escreve a idade", () => {
    expect(formatarIdade(0)).toBe("recém-nascido");
    expect(formatarIdade(1)).toBe("1 mês");
    expect(formatarIdade(15.4)).toBe("1 ano e 3 meses");
    expect(formatarIdade(48)).toBe("4 anos");
    expect(formatarIdade(90)).toBe("7 anos");
  });
});

describe("crianças estimadas pelas compras", () => {
  it("junta as compras da mesma criança e calcula a idade hoje", () => {
    // Comprou P (3 a 6 meses) em jan/2026 e G (9 a 12 meses) em jul/2026: uma criança
    // nascida por volta de ago/2025, com cerca de 1 ano e 1 mês em set/2026.
    const r = estimarCriancas(
      [
        { data: d("2026-01-15"), tamanho: "P" },
        { data: d("2026-07-15"), tamanho: "G" },
        { data: d("2026-07-15"), tamanho: null },
      ],
      d("2026-09-30"),
    );
    expect(r).toHaveLength(1);
    expect(r[0].pecas).toBe(2);
    expect(Math.round(r[0].idadeHoje)).toBe(13);
    expect(r[0].tamanhoHoje).toBe("1 ano");
    expect(r[0].ultimaCompra).toEqual(d("2026-07-15"));
  });

  it("separa crianças de idades bem diferentes", () => {
    const r = estimarCriancas(
      [
        { data: d("2026-09-01"), tamanho: "RN" },
        { data: d("2026-09-01"), tamanho: "4 anos" },
        { data: d("2026-06-01"), tamanho: "4 anos" },
      ],
      d("2026-09-30"),
    );
    expect(r).toHaveLength(2);
    expect(r[0].pecas).toBe(2);
    expect(r[0].tamanhoHoje).toBe("4 anos");
    expect(r[1].tamanhoHoje).toBe("RN");
  });

  it("peça de bebê comprada meses antes de outra menor é de outra criança", () => {
    // M (6 a 9 meses) em abril e RN em setembro: nascimentos a quase 1 ano de distância.
    const r = estimarCriancas(
      [
        { data: d("2026-04-10"), tamanho: "M" },
        { data: d("2026-09-28"), tamanho: "RN" },
        { data: d("2026-09-28"), tamanho: "P" },
      ],
      d("2026-09-30"),
    );
    expect(r.map((c) => c.pecas)).toEqual([2, 1]);
  });

  it("sem tamanhos, não estima nada", () => {
    expect(estimarCriancas([{ data: d("2026-09-01"), tamanho: null }], d("2026-09-30"))).toEqual([]);
  });
});

describe("resumo da cliente", () => {
  it("conta as marcas sem diferenciar maiúsculas", () => {
    expect(marcasPreferidas(["Tip Top", "tip top", "Puma", null, " ", "Baby Way", "Puma", "Tip Top"], 2)).toEqual([
      { marca: "Tip Top", pecas: 3 },
      { marca: "Puma", pecas: 2 },
    ]);
  });

  const vendas = [
    { data: d("2026-09-10"), totalCentavos: 5000 },
    { data: d("2026-09-20"), totalCentavos: 3000 },
    { data: d("2026-07-01"), totalCentavos: 1000 },
    { data: d("2025-01-01"), totalCentavos: 9999 },
  ];

  it("resumo anual: 12 meses por mês, com meses vazios", () => {
    const p = lerPeriodo({}, "2026-09-30");
    expect(p).toMatchObject({ tipo: "anual", de: "2025-10-01", ate: "2026-09-30", por: "mes" });
    const r = agruparGasto(vendas, p);
    expect(r).toHaveLength(12);
    expect(r[0]).toMatchObject({ chave: "2025-10", rotulo: "out/25", totalCentavos: 0 });
    expect(r.at(-3)).toMatchObject({ chave: "2026-07", totalCentavos: 1000, compras: 1 });
    expect(r.at(-1)).toMatchObject({ chave: "2026-09", rotulo: "set/26", totalCentavos: 8000, compras: 2 });
  });

  it("resumo mensal: um mês escolhido, por dia", () => {
    const p = lerPeriodo({ periodo: "mensal", mes: "2026-07" }, "2026-09-30");
    expect(p).toMatchObject({ tipo: "mensal", de: "2026-07-01", ate: "2026-07-31", por: "dia", rotulo: "julho de 2026" });
    const r = agruparGasto(vendas, p);
    expect(r).toHaveLength(31);
    expect(r[0]).toMatchObject({ rotulo: "01/07", totalCentavos: 1000 });
    // Mês atual vai só até hoje; mês no futuro volta para o atual.
    expect(lerPeriodo({ periodo: "mensal", mes: "2026-09" }, "2026-09-15").ate).toBe("2026-09-15");
    expect(lerPeriodo({ periodo: "mensal", mes: "2027-01" }, "2026-09-15").mes).toBe("2026-09");
  });

  it("resumo por período: datas escolhidas, por dia ou por mês", () => {
    const curto = lerPeriodo({ periodo: "periodo", de: "2026-09-01", ate: "2026-09-15" }, "2026-09-30");
    expect(curto).toMatchObject({ de: "2026-09-01", ate: "2026-09-15", por: "dia", rotulo: "01/09/2026 a 15/09/2026" });
    expect(agruparGasto(vendas, curto).reduce((s, x) => s + x.totalCentavos, 0)).toBe(5000);
    const longo = lerPeriodo({ periodo: "periodo", de: "2025-01-01", ate: "2026-09-30" }, "2026-09-30");
    expect(longo.por).toBe("mes");
    expect(agruparGasto(vendas, longo)).toHaveLength(21);
    // Datas trocadas são corrigidas; data no futuro vira hoje.
    expect(lerPeriodo({ periodo: "periodo", de: "2026-09-20", ate: "2026-09-10" }, "2026-09-30")).toMatchObject({ de: "2026-09-10", ate: "2026-09-20" });
    expect(lerPeriodo({ periodo: "periodo", de: "2026-09-20", ate: "2027-01-01" }, "2026-09-30").ate).toBe("2026-09-30");
  });
});

describe("tamanho de hoje da criança cadastrada", () => {
  const hoje = new Date("2026-10-05T12:00:00Z");
  it("pelo nascimento, quando houver", () => {
    expect(tamanhoDaCrianca({ nascimento: new Date("2024-09-01T00:00:00Z"), tamanho: "RN", tamanhoEm: null }, hoje)).toBe("2 anos");
  });
  it("pelo tamanho informado, que cresce com o tempo", () => {
    expect(tamanhoDaCrianca({ nascimento: null, tamanho: "2 anos", tamanhoEm: new Date("2026-09-01T00:00:00Z") }, hoje)).toBe("2 anos");
    expect(tamanhoDaCrianca({ nascimento: null, tamanho: "2 anos", tamanhoEm: new Date("2025-09-01T00:00:00Z") }, hoje)).toBe("3 anos");
    expect(tamanhoDaCrianca({ nascimento: null, tamanho: "P", tamanhoEm: new Date("2026-07-01T00:00:00Z") }, hoje)).toBe("M");
  });
  it("sem nascimento nem tamanho, não sabe", () => {
    expect(tamanhoDaCrianca({ nascimento: null, tamanho: null, tamanhoEm: null }, hoje)).toBeUndefined();
  });
});
