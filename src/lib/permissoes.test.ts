import { describe, expect, it } from "vitest";
import { destinoInicial, enderecoDeVoltaSeguro, PERFIS, podeAcessar, type Area, type Perfil } from "./permissoes";

// Tabela completa: cada perfil × cada área. Se uma regra mudar, este teste
// obriga a mudança a ser consciente.
const ESPERADO: Record<Perfil, Record<Area, boolean>> = {
  administradora: { painel: true, "painel-administracao": true, "area-cliente": false, "area-fornecedora": false },
  ajudante: { painel: true, "painel-administracao": false, "area-cliente": false, "area-fornecedora": false },
  cliente: { painel: false, "painel-administracao": false, "area-cliente": true, "area-fornecedora": false },
  fornecedora: { painel: false, "painel-administracao": false, "area-cliente": false, "area-fornecedora": true },
};

describe("podeAcessar", () => {
  for (const perfil of PERFIS) {
    for (const [area, pode] of Object.entries(ESPERADO[perfil]) as [Area, boolean][]) {
      it(`${perfil} ${pode ? "entra" : "não entra"} em ${area}`, () => {
        expect(podeAcessar([perfil], area)).toBe(pode);
      });
    }
  }

  it("sem perfil, não entra em lugar nenhum", () => {
    for (const area of Object.keys(ESPERADO.administradora) as Area[]) {
      expect(podeAcessar([], area)).toBe(false);
    }
  });

  it("quem tem dois perfis soma os acessos (fornecedora que também é cliente)", () => {
    expect(podeAcessar(["fornecedora", "cliente"], "area-cliente")).toBe(true);
    expect(podeAcessar(["fornecedora", "cliente"], "area-fornecedora")).toBe(true);
    expect(podeAcessar(["fornecedora", "cliente"], "painel")).toBe(false);
  });
});

describe("destinoInicial", () => {
  it("leva cada perfil para a sua área", () => {
    expect(destinoInicial(["administradora"])).toBe("/painel");
    expect(destinoInicial(["ajudante"])).toBe("/painel");
    expect(destinoInicial(["fornecedora"])).toBe("/fornecedora");
    expect(destinoInicial(["cliente"])).toBe("/");
    expect(destinoInicial(["cliente", "administradora"])).toBe("/painel");
  });
});

describe("enderecoDeVoltaSeguro", () => {
  it("aceita endereços do próprio site", () => {
    expect(enderecoDeVoltaSeguro("/painel")).toBe("/painel");
    expect(enderecoDeVoltaSeguro("/painel/estoque?tamanho=RN")).toBe("/painel/estoque?tamanho=RN");
  });

  it("recusa endereços de outros sites", () => {
    expect(enderecoDeVoltaSeguro("https://golpe.com")).toBeUndefined();
    expect(enderecoDeVoltaSeguro("//golpe.com")).toBeUndefined();
    expect(enderecoDeVoltaSeguro("/\\golpe.com")).toBeUndefined();
    expect(enderecoDeVoltaSeguro(null)).toBeUndefined();
  });
});
