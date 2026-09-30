import { describe, expect, it } from "vitest";
import { codigoConfere } from "./codigo-primeiro-acesso";
import { conferirSenha, gerarHash, normalizarEmail, problemaNaSenha } from "./senha";

describe("senha", () => {
  it("guarda só o hash e confere a senha certa", async () => {
    const hash = await gerarHash("baleia2026");
    expect(hash).not.toContain("baleia2026");
    expect(await conferirSenha("baleia2026", hash)).toBe(true);
    expect(await conferirSenha("baleia2027", hash)).toBe(false);
  });

  it("exige pelo menos 8 caracteres com letras e números", () => {
    expect(problemaNaSenha("abc123")).toBeDefined();
    expect(problemaNaSenha("abcdefgh")).toBeDefined();
    expect(problemaNaSenha("12345678")).toBeDefined();
    expect(problemaNaSenha("moda2026")).toBeUndefined();
  });

  it("ignora maiúsculas e espaços no e-mail", () => {
    expect(normalizarEmail("  Ana@SaltyBaby.com.br ")).toBe("ana@saltybaby.com.br");
  });
});

describe("código de primeiro acesso", () => {
  it("só confere quando o código foi configurado e é igual", () => {
    expect(codigoConfere("abc", "abc")).toBe(true);
    expect(codigoConfere(" abc ", "abc")).toBe(true);
    expect(codigoConfere("abd", "abc")).toBe(false);
    expect(codigoConfere("", undefined)).toBe(false);
    expect(codigoConfere("", "")).toBe(false);
  });
});
