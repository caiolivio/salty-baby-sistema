import { describe, expect, it } from "vitest";
import {
  acessoDaEquipe,
  destinoInicial,
  enderecoDeVoltaSeguro,
  lerPermissoes,
  PAGINAS,
  PERFIS,
  podeAcessar,
  podeAlterar,
  podeVer,
  primeiraPagina,
  resumoDoAcesso,
  temExtra,
  type Area,
  type Perfil,
} from "./permissoes";

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
    expect(destinoInicial(["cliente"])).toBe("/minha-conta");
    expect(destinoInicial([])).toBe("/");
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

describe("acesso da equipe", () => {
  const suporte = acessoDaEquipe(
    ["ajudante"],
    [
      { chave: "pecas", nivel: "alterar" },
      { chave: "vendas", nivel: "ver" },
      { chave: "excluir_peca", nivel: "sim" },
      // Chaves ou níveis desconhecidos são ignorados.
      { chave: "configuracoes", nivel: "alterar" },
      { chave: "clientes", nivel: "tudo" },
      { chave: "backup", nivel: "ver" },
    ],
  );

  it("a administradora pode tudo, mesmo sem nada marcado", () => {
    const admin = acessoDaEquipe(["administradora"], []);
    for (const p of PAGINAS) expect(podeAlterar(admin, p.chave)).toBe(true);
    expect(temExtra(admin, "backup")).toBe(true);
    expect(temExtra(admin, "valores")).toBe(true);
  });

  it("o suporte só usa o que foi marcado, no nível marcado", () => {
    expect(podeVer(suporte, "pecas")).toBe(true);
    expect(podeAlterar(suporte, "pecas")).toBe(true);
    expect(podeVer(suporte, "vendas")).toBe(true);
    expect(podeAlterar(suporte, "vendas")).toBe(false);
    expect(podeVer(suporte, "clientes")).toBe(false);
    expect(podeVer(suporte, "historico")).toBe(false);
    expect(temExtra(suporte, "excluir_peca")).toBe(true);
    expect(temExtra(suporte, "backup")).toBe(false);
    expect(temExtra(suporte, "valores")).toBe(false);
    expect(temExtra(suporte, "confirmar_pagamento")).toBe(false);
    expect(suporte.administradora).toBe(false);
  });

  it("permissões gravadas não valem para quem não é da equipe", () => {
    const cliente = acessoDaEquipe(["cliente"], [{ chave: "pecas", nivel: "alterar" }]);
    expect(podeVer(cliente, "pecas")).toBe(false);
    expect(temExtra(cliente, "backup")).toBe(false);
  });

  it("depois de entrar, o suporte vai para a primeira página liberada", () => {
    expect(primeiraPagina(suporte)).toBe("/painel/pecas");
    expect(primeiraPagina(acessoDaEquipe(["ajudante"], [{ chave: "vendas", nivel: "ver" }]))).toBe("/painel/vendas");
    expect(primeiraPagina(acessoDaEquipe(["ajudante"], []))).toBe("/painel");
  });

  it("lê as marcações do formulário e ignora o resto", () => {
    expect(
      lerPermissoes({
        "pagina:pecas": "alterar",
        "pagina:vendas": "ver",
        "pagina:clientes": "",
        "pagina:configuracoes": "alterar",
        "extra:backup": "sim",
        "extra:valores": "nao",
        "extra:apagar_tudo": "sim",
      }),
    ).toEqual([
      { chave: "pecas", nivel: "alterar" },
      { chave: "vendas", nivel: "ver" },
      { chave: "backup", nivel: "sim" },
    ]);
  });

  it("resume o acesso em uma linha", () => {
    expect(resumoDoAcesso(suporte)).toBe("Peças (ver e alterar), Vendas (só ver). Também: excluir peças");
    expect(resumoDoAcesso(acessoDaEquipe(["ajudante"], []))).toBe("Nenhuma página");
  });
});
