import { describe, expect, it } from "vitest";
import { generosMarcados, lerGeneros, nomeDosGeneros } from "./generos";

describe("gênero em caixinhas", () => {
  it("lê as caixinhas marcadas", () => {
    expect(lerGeneros(["feminino"])).toEqual({ genero: "feminino", unissex: false });
    expect(lerGeneros(["feminino", "unissex"])).toEqual({ genero: "feminino", unissex: true });
    expect(lerGeneros(["masculino", "unissex"])).toEqual({ genero: "masculino", unissex: true });
    expect(lerGeneros(["unissex"])).toEqual({ genero: "unissex", unissex: true });
    expect(lerGeneros(["feminino", "masculino"])).toEqual({ genero: "unissex", unissex: false });
    expect(lerGeneros(["feminino", "masculino", "unissex"])).toEqual({ genero: "unissex", unissex: true });
    expect(lerGeneros([])).toEqual({ genero: null, unissex: false });
    expect(lerGeneros(["outro", 3])).toEqual({ genero: null, unissex: false });
  });

  it("volta para as caixinhas", () => {
    for (const marcadas of [["feminino"], ["feminino", "unissex"], ["masculino", "unissex"], ["unissex"], ["feminino", "masculino"], []]) {
      const { genero, unissex } = lerGeneros(marcadas);
      expect(generosMarcados(genero, unissex)).toEqual(marcadas);
    }
  });

  it("dá o nome", () => {
    expect(nomeDosGeneros("feminino", true)).toBe("Menina + Unissex");
    expect(nomeDosGeneros("unissex", true)).toBe("Unissex");
    expect(nomeDosGeneros("unissex", false)).toBe("Menina + Menino");
    expect(nomeDosGeneros(null, false)).toBe("");
  });
});
