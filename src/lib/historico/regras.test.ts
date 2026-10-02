import { describe, expect, it } from "vitest";
import {
  CAMPOS_CLIENTE,
  CAMPOS_FORNECEDORA,
  compararParcial,
  compararPeca,
  descreverMudanca,
  mudancaDeStatus,
  resumir,
  type EstadoFornecedora,
  type EstadoPeca,
} from "./regras";

const peca: EstadoPeca = {
  nome: "Macacão",
  status: "publicada",
  naoListada: false,
  precoCentavos: 3000,
  custoCentavos: null,
  percentualRepasse: 4000,
  quantidade: 1,
  tamanho: "RN",
  genero: "feminino",
  conservacao: "seminova",
  nota: 8,
  variacao: null,
  marca: "Pingo Lelê",
  cor: null,
  medidas: null,
  descricao: null,
  dataEntrada: new Date("2026-09-01T00:00:00Z"),
  categorias: ["Roupas"],
};

describe("histórico da peça", () => {
  it("sem mudança, não registra nada", () => {
    expect(compararPeca(peca, { ...peca })).toEqual([]);
  });

  it("registra preço e status com os nomes da tela", () => {
    const mudancas = compararPeca(peca, { ...peca, precoCentavos: 2500, naoListada: true }).map((m) => ({
      ...m,
      antes: m.antes?.replace(/\s/g, " "), // o R$ usa espaço não separável
      depois: m.depois?.replace(/\s/g, " "),
    }));
    expect(mudancas).toEqual([
      { campo: "Status", antes: "À venda", depois: "Não listado", restrito: false },
      { campo: "Preço", antes: "R$ 30,00", depois: "R$ 25,00", restrito: false },
    ]);
  });

  it("repasse e custo só a administradora vê", () => {
    const [m] = compararPeca(peca, { ...peca, percentualRepasse: 5000 });
    expect(m).toEqual({ campo: "% repasse", antes: "40%", depois: "50%", restrito: true });
  });

  it("mostra tamanho, data e categorias de um jeito legível, sem ligar para a ordem", () => {
    const mudancas = compararPeca(
      { ...peca, categorias: ["Roupas", "Fantasias"] },
      { ...peca, categorias: ["Fantasias", "Roupas"], tamanho: "P", dataEntrada: new Date("2026-09-02T00:00:00Z"), cor: "Azul" },
    );
    expect(mudancas.map((m) => [m.campo, descreverMudanca(m)])).toEqual([
      ["Tamanho", "RN (0 a 3 meses) → P (3 a 6 meses)"],
      ["Cor", "(vazio) → Azul"],
      ["Data de entrada", "01/09/2026 → 02/09/2026"],
    ]);
  });

  it("troca só de status (reserva, venda)", () => {
    expect(mudancaDeStatus({ status: "publicada" }, { status: "reservada" })).toEqual({
      campo: "Status",
      antes: "À venda",
      depois: "Reservada",
      restrito: false,
    });
    expect(mudancaDeStatus({ status: "publicada" }, { status: "publicada" })).toBeNull();
  });
});

describe("histórico de fornecedora e cliente", () => {
  const fornecedora: EstadoFornecedora = {
    nome: "Ana",
    telefone: "12981053623",
    email: null,
    documento: "12345678901",
    pix: "ana@pix",
    endereco: null,
    cep: null,
    cidade: null,
    estado: null,
    percentualRepassePadrao: 4000,
    ativa: true,
  };

  it("CPF e Pix: guarda só que mudaram, nunca o valor", () => {
    const mudancas = compararParcial(CAMPOS_FORNECEDORA, fornecedora, { documento: "98765432100", pix: null });
    expect(mudancas).toEqual([
      { campo: "CPF/CNPJ", antes: null, depois: "(alterado)", restrito: true },
      { campo: "Pix", antes: null, depois: "(apagado)", restrito: true },
    ]);
    expect(mudancas.map(descreverMudanca)).toEqual(["(alterado)", "(apagado)"]);
    expect(JSON.stringify(mudancas)).not.toContain("98765432100");
  });

  it("campos que a pessoa não editou não aparecem", () => {
    const mudancas = compararParcial(CAMPOS_FORNECEDORA, fornecedora, { nome: "Ana Souza", telefone: "12981053623" });
    expect(mudancas).toEqual([{ campo: "Nome", antes: "Ana", depois: "Ana Souza", restrito: false }]);
  });

  it("WhatsApp da cliente aparece formatado", () => {
    const [m] = compararParcial(CAMPOS_CLIENTE, { nome: "Lu", telefone: "12991112222", email: null }, { telefone: "12991113333" });
    expect(descreverMudanca(m)).toBe("(12) 99111-2222 → (12) 99111-3333");
  });
});

it("o cadastro mostra só a descrição", () => {
  expect(descreverMudanca({ campo: "Cadastro", antes: null, depois: "Cadastrada: Rascunho" })).toBe("Cadastrada: Rascunho");
});

it("textos longos ficam cortados", () => {
  expect(resumir("a".repeat(400))?.length).toBe(300);
  expect(resumir("curto")).toBe("curto");
  expect(resumir(null)).toBeNull();
});

describe("CAMPOS_LOJA", () => {
  it("mostra o WhatsApp formatado e a troca de logo sem o caminho do arquivo", async () => {
    const { CAMPOS_LOJA, comparar } = await import("./regras");
    const { LOJA_PADRAO } = await import("../loja/regras");
    const mudancas = comparar(CAMPOS_LOJA, LOJA_PADRAO, {
      ...LOJA_PADRAO,
      whatsapp: "5513998765432",
      logo: "loja/logo-1234-abcd-efgh5678.png",
      repassePadrao: 5000,
    });
    expect(mudancas).toEqual([
      { campo: "WhatsApp da loja", antes: "(12) 98105-3623", depois: "(13) 99876-5432", restrito: false },
      { campo: "Logo", antes: "original", depois: "imagem enviada (efgh5678)", restrito: false },
      { campo: "% repasse padrão", antes: "40%", depois: "50%", restrito: true },
    ]);
  });
});
