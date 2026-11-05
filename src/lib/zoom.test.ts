import { describe, expect, it } from "vitest";
import { ampliarEm, limitar, origemDaLupa, SEM_ZOOM, toqueDuplo } from "./zoom";

describe("zoom da foto", () => {
  it("não deixa arrastar a foto para fora da borda", () => {
    expect(limitar({ escala: 2, x: 500, y: -500 }, 400, 400)).toEqual({ escala: 2, x: 200, y: -200 });
    expect(limitar({ escala: 0.5, x: 10, y: 10 }, 400, 400)).toEqual(SEM_ZOOM);
    expect(limitar({ escala: 9, x: 0, y: 0 }, 400, 400).escala).toBe(4);
  });

  it("amplia mantendo parado o ponto tocado", () => {
    // Tocar 100px à direita do centro: a foto anda para a esquerda.
    expect(ampliarEm(SEM_ZOOM, 2, 100, 0, 400, 400)).toEqual({ escala: 2, x: -100, y: 0 });
  });

  it("toque duplo amplia e, de novo, volta", () => {
    const perto = toqueDuplo(SEM_ZOOM, 0, 0, 400, 400);
    expect(perto.escala).toBe(2.5);
    expect(toqueDuplo(perto, 0, 0, 400, 400)).toEqual(SEM_ZOOM);
  });

  it("lupa segue o mouse", () => {
    expect(origemDaLupa(100, 300, 400, 400)).toBe("25% 75%");
    expect(origemDaLupa(-5, 900, 400, 400)).toBe("0% 100%");
  });
});
