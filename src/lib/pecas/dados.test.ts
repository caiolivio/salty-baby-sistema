import { describe, expect, it } from "vitest";
import { escolherCategorias, hojeEmSaoPaulo, moverNaLista, lerFormularioPeca, reaisNoCampo, situacaoEditavel, statusNoFormulario } from "./dados";
import { nomeDoStatus } from "../situacoes";

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

  it("não deixa escolher um status de venda no cadastro", () => {
    expect(lerFormularioPeca({ nome: "Body", status: "vendida", precoCentavos: "20" }, consignada)).toEqual({
      ok: false,
      erro: "Escolha o status.",
    });
  });

  it("\"Não listado\" fica à venda, mas fora da vitrine, e também precisa de preço", () => {
    const r = lerFormularioPeca({ nome: "Body", status: "nao_listada", precoCentavos: "20" }, consignada);
    expect(r.ok && [r.dados.status, r.dados.naoListada]).toEqual(["publicada", true]);
    const publicada = lerFormularioPeca({ nome: "Body", status: "publicada", precoCentavos: "20" }, consignada);
    expect(publicada.ok && publicada.dados.naoListada).toBe(false);
    expect(lerFormularioPeca({ nome: "Body", status: "nao_listada" }, consignada)).toEqual({
      ok: false,
      erro: "Para colocar à venda, escreva o preço.",
    });
    expect(statusNoFormulario("publicada", true)).toBe("nao_listada");
    expect(statusNoFormulario("vendida", true)).toBe("vendida");
    expect(nomeDoStatus("publicada", true)).toBe("Não listado");
    expect(nomeDoStatus("publicada")).toBe("À venda");
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

  it("aceita nota de 5 a 10 ou sem nota", () => {
    const nove = lerFormularioPeca({ nome: "Body", nota: "9" }, consignada);
    expect(nove.ok && nove.dados.nota).toBe(9);
    const sem = lerFormularioPeca({ nome: "Body", nota: "" }, consignada);
    expect(sem.ok && sem.dados.nota).toBeNull();
    for (const nota of ["4", "11", "7,5", "dez"]) {
      expect(lerFormularioPeca({ nome: "Body", nota }, consignada)).toEqual({ ok: false, erro: "A nota vai de 5 a 10." });
    }
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

describe("escolherCategorias", () => {
  it("aceita mais de uma categoria e ignora repetidas", () => {
    expect(escolherCategorias(["roupas", "fantasias", "roupas"], ["roupas", "fantasias", "livros"])).toEqual(["roupas", "fantasias"]);
  });
  it("ignora categorias que não existem ou foram desativadas", () => {
    expect(escolherCategorias(["roupas", "inventada", 3], ["roupas"])).toEqual(["roupas"]);
    expect(escolherCategorias([], ["roupas"])).toEqual([]);
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

describe("moverNaLista (ordem das fotos)", () => {
  const fotos = ["a", "b", "c", "d"];
  it("coloca uma foto em destaque (primeira)", () => {
    expect(moverNaLista(fotos, "c", 0)).toEqual(["c", "a", "b", "d"]);
  });
  it("move uma posição para frente ou para trás", () => {
    expect(moverNaLista(fotos, "b", 2)).toEqual(["a", "c", "b", "d"]);
    expect(moverNaLista(fotos, "b", 0)).toEqual(["b", "a", "c", "d"]);
  });
  it("não sai da lista nas pontas", () => {
    expect(moverNaLista(fotos, "a", -1)).toEqual(fotos);
    expect(moverNaLista(fotos, "d", 9)).toEqual(fotos);
    expect(moverNaLista(fotos, "x", 0)).toEqual(fotos);
  });
});
