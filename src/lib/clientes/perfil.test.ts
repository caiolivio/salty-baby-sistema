import { describe, expect, it } from "vitest";
import { estimarCriancas, faixaDoTamanho, formatarIdade, gastoPorMes, marcasPreferidas, tamanhoParaIdade } from "./perfil";

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

  it("soma o gasto por mês, com meses vazios", () => {
    const r = gastoPorMes(
      [
        { data: d("2026-09-10"), totalCentavos: 5000 },
        { data: d("2026-09-20"), totalCentavos: 3000 },
        { data: d("2026-07-01"), totalCentavos: 1000 },
        { data: d("2025-01-01"), totalCentavos: 9999 },
      ],
      d("2026-09-30"),
      3,
    );
    expect(r).toEqual([
      { mes: "2026-07", totalCentavos: 1000, compras: 1 },
      { mes: "2026-08", totalCentavos: 0, compras: 0 },
      { mes: "2026-09", totalCentavos: 8000, compras: 2 },
    ]);
  });
});
