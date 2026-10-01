import { describe, expect, it } from "vitest";
import {
  codigoDoGrupo,
  grupoMaisSugerido,
  gruposSugeridos,
  lerCodigoGrupo,
  lerNomeGrupo,
  lerPapelGrupo,
  linkDoPost,
  papeisSugeridos,
  aberturaDaDivulgacao,
  linkDaPeca,
  textoDaDivulgacao,
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

const vestido = {
  codigo: "F06-00001",
  nome: "Vestido florido",
  descricao: "Lindo para festas.",
  categorias: ["Roupas", "Fantasias"],
  tamanho: "2 anos",
  preco: "R$ 39,90",
  marca: "Fakini",
  nota: 9,
};
const livro = {
  codigo: "SB-00002",
  nome: "Livro",
  descricao: null,
  categorias: [],
  tamanho: null,
  preco: "R$ 10,00",
  marca: null,
  nota: null,
};

describe("post pronto", () => {
  it("põe cada informação numa linha, na ordem pedida", () => {
    const link = linkDoPost("https://teste.saltybaby.com.br/", "F06-00001", "meninas");
    expect(link).toBe("https://teste.saltybaby.com.br/peca/f06-00001?g=meninas");
    expect(textoDoPost(vestido, link).split("\n")).toEqual([
      "*Vestido florido*",
      "Lindo para festas.",
      "Categoria: Roupas, Fantasias",
      "Tamanho: 2 anos",
      "Preço: R$ 39,90",
      "Marca: Fakini",
      "Nota: 9",
      "Para comprar: https://teste.saltybaby.com.br/peca/f06-00001?g=meninas",
    ]);
  });

  it("pula as informações vazias", () => {
    expect(textoDoPost(livro, "https://x/peca/sb-00002").split("\n")).toEqual([
      "*Livro*",
      "Preço: R$ 10,00",
      "Para comprar: https://x/peca/sb-00002",
    ]);
  });

  it("monta o link com ou sem grupo", () => {
    expect(linkDaPeca("https://x/", "SB-00002", "menino")).toBe("https://x/peca/sb-00002?g=menino");
    expect(linkDaPeca("https://x/", "SB-00002")).toBe("https://x/peca/sb-00002");
  });
});

describe("divulgação com várias peças", () => {
  const lista = [
    { id: "a", papel: "masculino", ativo: true },
    { id: "b", papel: "feminino", ativo: true },
    { id: "c", papel: "calcados", ativo: true },
  ];

  it("sugere o grupo indicado para mais peças", () => {
    const pecas = [
      { genero: "masculino", categorias: [] },
      { genero: null, categorias: [] },
      { genero: "masculino", categorias: ["Roupas"] },
    ];
    expect(grupoMaisSugerido(pecas, lista)?.id).toBe("a");
    expect(grupoMaisSugerido([{ genero: null, categorias: ["Calçados"] }], lista)?.id).toBe("c");
    expect(grupoMaisSugerido([], lista)).toBeUndefined();
  });

  it("monta a abertura e cada peça separada por uma linha em branco", () => {
    expect(
      textoDaDivulgacao({
        titulo: " Destaques da *semana* para meninos RN ",
        texto: "Chegaram hoje!",
        pecas: [vestido, livro],
        origem: "https://teste.saltybaby.com.br/",
        codigoGrupo: "menino",
      }),
    ).toBe(
      [
        "*Destaques da semana para meninos RN*",
        "Chegaram hoje!",
        textoDoPost(vestido, "https://teste.saltybaby.com.br/peca/f06-00001?g=menino"),
        textoDoPost(livro, "https://teste.saltybaby.com.br/peca/sb-00002?g=menino"),
      ].join("\n\n"),
    );
  });

  it("funciona sem título, sem texto e sem grupo", () => {
    expect(aberturaDaDivulgacao("", " ")).toBe("");
    expect(textoDaDivulgacao({ titulo: "", texto: " ", pecas: [livro], origem: "https://x" })).toBe(
      "*Livro*\nPreço: R$ 10,00\nPara comprar: https://x/peca/sb-00002",
    );
  });
});
