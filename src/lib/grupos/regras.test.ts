import { describe, expect, it } from "vitest";
import {
  codigoDoGrupo,
  gruposSugeridos,
  lerCodigoGrupo,
  lerNomeGrupo,
  lerPapelGrupo,
  linkDoPost,
  papeisSugeridos,
  textoDoPost,
} from "./regras";

const grupos = [
  { nome: "Menino", papel: "masculino", ativo: true },
  { nome: "Meninas", papel: "feminino", ativo: true },
  { nome: "Liquida Salty", papel: "promocao", ativo: true },
  { nome: "Acessórios", papel: "acessorios", ativo: true },
  { nome: "Calçados", papel: "calcados", ativo: true },
  { nome: "Antigo", papel: "feminino", ativo: false },
  { nome: "Sem regra", papel: null, ativo: true },
];
const nomes = (peca: Parameters<typeof papeisSugeridos>[0]) => gruposSugeridos(peca, grupos).map((g) => g.nome);

describe("grupo sugerido", () => {
  it("usa o gênero para roupas", () => {
    expect(nomes({ genero: "masculino", categorias: ["Roupas"] })).toEqual(["Menino"]);
    expect(nomes({ genero: "feminino", categorias: ["Roupas"] })).toEqual(["Meninas"]);
  });

  it("manda unissex e peça sem gênero para os dois grupos", () => {
    expect(nomes({ genero: "unissex", categorias: [] })).toEqual(["Menino", "Meninas"]);
    expect(nomes({ genero: null, categorias: ["Brinquedos"] })).toEqual(["Menino", "Meninas"]);
  });

  it("manda acessório e calçado para o próprio grupo, com ou sem acento", () => {
    expect(nomes({ genero: "feminino", categorias: ["Calçados"] })).toEqual(["Calçados"]);
    expect(nomes({ genero: "masculino", categorias: ["Acessórios para carro"] })).toEqual(["Acessórios"]);
    expect(nomes({ genero: null, categorias: ["acessorios de bebe", "Calcados"] })).toEqual(["Acessórios", "Calçados"]);
  });

  it("manda peça em promoção para a Liquida, menos acessório e calçado", () => {
    expect(nomes({ genero: "feminino", categorias: ["Roupas"], emPromocao: true })).toEqual(["Liquida Salty"]);
    expect(nomes({ genero: "feminino", categorias: ["Calçados"], emPromocao: true })).toEqual(["Calçados"]);
  });

  it("ignora grupos desativados e sem regra", () => {
    expect(papeisSugeridos({ genero: "feminino", categorias: [] })).toEqual(["feminino"]);
    expect(nomes({ genero: "feminino", categorias: [] })).not.toContain("Antigo");
  });
});

describe("dados do grupo", () => {
  it("cria a marca do link a partir do nome", () => {
    expect(codigoDoGrupo("Liquida Salty")).toBe("liquida-salty");
    expect(codigoDoGrupo("  Calçados & Botas! ")).toBe("calcados-botas");
  });

  it("lê a marca do link e recusa o que não é marca", () => {
    expect(lerCodigoGrupo("Meninas")).toBe("meninas");
    expect(lerCodigoGrupo("a b")).toBeUndefined();
    expect(lerCodigoGrupo(undefined)).toBeUndefined();
  });

  it("valida o nome e a regra do grupo", () => {
    expect(lerNomeGrupo("  Grupo   Novo ")).toEqual({ ok: true, nome: "Grupo Novo" });
    expect(lerNomeGrupo("x")).toEqual({ ok: false, erro: "Escreva o nome do grupo." });
    expect(lerNomeGrupo("!!!")).toEqual({ ok: false, erro: "Use letras ou números no nome do grupo." });
    expect(lerPapelGrupo("calcados")).toBe("calcados");
    expect(lerPapelGrupo("")).toBeNull();
  });
});

describe("post pronto", () => {
  it("monta o texto com o link marcado pelo grupo", () => {
    const link = linkDoPost("https://teste.saltybaby.com.br/", "F06-00001", "meninas");
    expect(link).toBe("https://teste.saltybaby.com.br/peca/f06-00001?g=meninas");
    expect(
      textoDoPost(
        {
          codigo: "F06-00001",
          nome: "Vestido florido",
          tamanho: "2 anos",
          marca: "Fakini",
          conservacao: "Seminova",
          medidas: null,
          preco: "R$ 39,90",
        },
        link,
      ),
    ).toBe(
      "✨ Vestido florido\nTam. 2 anos · Fakini · Seminova\n💰 R$ 39,90\nCódigo F06-00001\n\nPara comprar, é só clicar: https://teste.saltybaby.com.br/peca/f06-00001?g=meninas",
    );
  });

  it("pula os detalhes vazios", () => {
    const texto = textoDoPost(
      { codigo: "SB-00001", nome: "Livro", tamanho: null, marca: null, conservacao: null, medidas: null, preco: "R$ 10,00" },
      "https://x/peca/sb-00001?g=menino",
    );
    expect(texto.split("\n")).toEqual(["✨ Livro", "💰 R$ 10,00", "Código SB-00001", "", "Para comprar, é só clicar: https://x/peca/sb-00001?g=menino"]);
  });
});
