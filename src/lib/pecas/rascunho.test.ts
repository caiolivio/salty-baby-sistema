import { describe, expect, it } from "vitest";
import { camposDoFormulario, chaveDoRascunho, quandoFoiGuardado, rascunhoDiferente, rascunhoVencido } from "./rascunho";

describe("rascunho do cadastro", () => {
  it("guarda os campos, sem id, arquivos e campos internos", () => {
    const entradas: [string, FormDataEntryValue][] = [
      ["id", "p1"],
      ["nome", "Body"],
      ["categorias", "c1"],
      ["categorias", "c2"],
      ["$ACTION_ID_x", ""],
    ];
    expect(camposDoFormulario(entradas)).toEqual({ nome: ["Body"], categorias: ["c1", "c2"] });
  });

  it("só oferece o rascunho quando há algo diferente", () => {
    const inicial = { nome: [""], quantidade: ["1"], status: ["rascunho"] };
    expect(rascunhoDiferente({ quantidade: ["1"], status: ["rascunho"], nome: [""] }, inicial)).toBe(false);
    expect(rascunhoDiferente({ ...inicial, nome: ["Body"] }, inicial)).toBe(true);
    expect(rascunhoDiferente({ categorias: ["b", "a"] }, { categorias: ["a", "b"] })).toBe(false);
    expect(rascunhoDiferente(inicial, inicial, 2)).toBe(true);
  });

  it("um rascunho por peça", () => {
    expect(chaveDoRascunho()).toBe("peca:nova");
    expect(chaveDoRascunho("abc")).toBe("peca:abc");
  });

  it("esquece rascunhos com mais de 14 dias", () => {
    const agora = Date.parse("2026-11-20T12:00:00Z");
    expect(rascunhoVencido(Date.parse("2026-11-05T12:00:00Z"), agora)).toBe(true);
    expect(rascunhoVencido(Date.parse("2026-11-10T12:00:00Z"), agora)).toBe(false);
  });

  it("diz quando foi guardado, no horário de Brasília", () => {
    const agora = Date.parse("2026-11-05T20:00:00Z");
    expect(quandoFoiGuardado(Date.parse("2026-11-05T17:32:00Z"), agora)).toBe("às 14h32");
    expect(quandoFoiGuardado(Date.parse("2026-11-03T17:32:00Z"), agora)).toBe("em 03/11 às 14h32");
  });
});
