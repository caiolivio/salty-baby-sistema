import { describe, expect, it } from "vitest";
import { hojeEmSaoPaulo, lerFormularioPeca, reaisNoCampo, situacaoEditavel } from "./dados";

const consignada = { consignada: true, repassePadrao: 4000, hoje: "2026-09-30" };
const loja = { consignada: false, repassePadrao: 4000, hoje: "2026-09-30" };

describe("lerFormularioPeca", () => {
  it("usa os padrões: quantidade 1, rascunho, entrada hoje e o repasse da fornecedora", () => {
    const r = lerFormularioPeca({ nome: "Macacão" }, { ...consignada, repassePadrao: 4500 });
    expect(r.ok && r.dados).toMatchObject({
      nome: "Macacão",
      quantidade: 1,
      status: "rascunho",
      dataEntrada: "2026-09-30",
      percentualRepasse: 4500,
      precoCentavos: 0,
      custoCentavos: null,
    });
  });

  it("lê preço em reais sem usar float", () => {
    const r = (preco: string) => {
      const x = lerFormularioPeca({ nome: "Body", precoCentavos: preco }, consignada);
      return x.ok ? x.dados.precoCentavos : x.erro;
    };
    expect(r("45,90")).toBe(4590);
    expect(r("R$ 1.234,56")).toBe(123456);
    expect(r("12")).toBe(1200);
    expect(r("0,1")).toBe(10);
    expect(r("doze")).toBe("Escreva o preço em reais, por exemplo 45,90.");
    expect(r("-5")).toBe("Escreva o preço em reais, por exemplo 45,90.");
  });

  it("não coloca à venda sem preço", () => {
    expect(lerFormularioPeca({ nome: "Body", status: "publicada" }, consignada)).toEqual({
      ok: false,
      erro: "Para colocar à venda, escreva o preço.",
    });
    expect(lerFormularioPeca({ nome: "Body", status: "publicada", precoCentavos: "20" }, consignada).ok).toBe(true);
  });

  it("não deixa escolher uma situação de venda no cadastro", () => {
    expect(lerFormularioPeca({ nome: "Body", status: "vendida", precoCentavos: "20" }, consignada)).toEqual({
      ok: false,
      erro: "Escolha a situação.",
    });
  });

  it("peça consignada tem repasse e não tem custo; peça da loja tem custo e não tem repasse", () => {
    const valores = { nome: "Body", precoCentavos: "30", custoCentavos: "10", percentualRepasse: "50" };
    const c = lerFormularioPeca(valores, consignada);
    expect(c.ok && [c.dados.percentualRepasse, c.dados.custoCentavos]).toEqual([5000, null]);
    const l = lerFormularioPeca(valores, loja);
    expect(l.ok && [l.dados.percentualRepasse, l.dados.custoCentavos]).toEqual([null, 1000]);
  });

  it("aceita só tamanhos, gêneros e conservações da lista", () => {
    const ok = lerFormularioPeca({ nome: "Body", tamanho: "RN", genero: "unissex", conservacao: "seminova" }, consignada);
    expect(ok.ok && [ok.dados.tamanho, ok.dados.genero, ok.dados.conservacao]).toEqual(["RN", "unissex", "seminova"]);
    expect(lerFormularioPeca({ nome: "Body", tamanho: "XG" }, consignada)).toEqual({ ok: false, erro: "Escolha um tamanho da lista." });
  });

  it("confere a quantidade e o repasse", () => {
    expect(lerFormularioPeca({ nome: "Body", quantidade: "2,5" }, consignada).ok).toBe(false);
    const dois = lerFormularioPeca({ nome: "Body", quantidade: "2" }, consignada);
    expect(dois.ok && dois.dados.quantidade).toBe(2);
    expect(lerFormularioPeca({ nome: "Body", percentualRepasse: "150" }, consignada)).toEqual({
      ok: false,
      erro: "O repasse vai de 0 a 100%, por exemplo 40.",
    });
  });
});

describe("apoio", () => {
  it("só as situações de cadastro são editáveis", () => {
    expect(situacaoEditavel("publicada")).toBe(true);
    expect(situacaoEditavel("vendida")).toBe(false);
  });
  it("data de hoje no fuso de São Paulo", () => {
    expect(hojeEmSaoPaulo(new Date("2026-10-01T02:00:00Z"))).toBe("2026-09-30");
  });
  it("mostra centavos no campo", () => {
    expect(reaisNoCampo(4590)).toBe("45,90");
    expect(reaisNoCampo(1200)).toBe("12,00");
    expect(reaisNoCampo(null)).toBe("");
  });
});
