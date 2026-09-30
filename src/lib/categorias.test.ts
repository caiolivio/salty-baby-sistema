import { describe, expect, it } from "vitest";
import { lerNomeCategoria } from "./categorias";

describe("lerNomeCategoria", () => {
  it("tira os espaços sobrando", () => {
    expect(lerNomeCategoria("  Acessórios   de  bebê ")).toEqual({ ok: true, nome: "Acessórios de bebê" });
  });
  it("exige um nome de 2 a 60 letras", () => {
    expect(lerNomeCategoria(" ")).toEqual({ ok: false, erro: "Escreva o nome da categoria." });
    expect(lerNomeCategoria("x".repeat(61))).toEqual({ ok: false, erro: "Use no máximo 60 caracteres." });
    expect(lerNomeCategoria(undefined).ok).toBe(false);
  });
});
