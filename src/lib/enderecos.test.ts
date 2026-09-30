import { describe, expect, it } from "vitest";
import { enderecoNormalizado } from "./enderecos";

describe("enderecoNormalizado", () => {
  it("corrige a maiúscula que o celular coloca no começo", () => {
    expect(enderecoNormalizado("/Painel/pecas")).toBe("/painel/pecas");
  });
  it("tira o acento que o corretor coloca", () => {
    expect(enderecoNormalizado("/painel/pe%C3%A7as")).toBe("/painel/pecas");
    expect(enderecoNormalizado("/painel/Peças/nova")).toBe("/painel/pecas/nova");
  });
  it("não mexe no endereço que já está certo", () => {
    expect(enderecoNormalizado("/painel/pecas")).toBeNull();
    expect(enderecoNormalizado("/")).toBeNull();
  });
  it("ignora endereço com codificação quebrada", () => {
    expect(enderecoNormalizado("/painel/%E0%A4%A")).toBeNull();
  });
});
