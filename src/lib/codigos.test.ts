import { describe, expect, it } from "vitest";
import { codigoFornecedora, codigoPeca } from "./codigos";
import { lerTamanho, ordemDoTamanho, TAMANHOS } from "./tamanhos";

describe("códigos", () => {
  it("fornecedora: F + pelo menos 2 dígitos", () => {
    expect(codigoFornecedora(6)).toBe("F06");
    expect(codigoFornecedora(48)).toBe("F48");
    expect(codigoFornecedora(100)).toBe("F100");
  });

  it("peça: prefixo + 5 dígitos", () => {
    expect(codigoPeca("F48", 1)).toBe("F48-00001");
    expect(codigoPeca("SB", 12)).toBe("SB-00012");
    expect(() => codigoPeca("F48", 0)).toThrow();
  });
});

describe("tamanhos", () => {
  it("seguem a ordem do CLAUDE.md, com Prematuro antes do RN", () => {
    expect(TAMANHOS.map((t) => t.valor).slice(0, 8)).toEqual(["Prematuro", "RN", "P", "M", "G", "1 ano", "18 meses", "2 anos"]);
    expect(TAMANHOS.at(-1)?.valor).toBe("18 anos");
    expect(ordemDoTamanho("RN")).toBeLessThan(ordemDoTamanho("P"));
  });

  it("reconhece jeitos diferentes de escrever", () => {
    expect(lerTamanho("Rn")).toBe("RN");
    expect(lerTamanho("prematuro")).toBe("Prematuro");
    expect(lerTamanho("2")).toBe("2 anos");
    expect(lerTamanho("1")).toBe("1 ano");
    expect(lerTamanho("xg")).toBeUndefined();
  });
});
