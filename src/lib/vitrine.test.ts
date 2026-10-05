import { describe, expect, it } from "vitest";
import {
  enderecoDaPeca,
  generosDoPublico,
  lerFiltros,
  linkDaVitrine,
  linkWhatsapp,
  linkCompartilharWhatsapp,
  mensagemDaPeca,
  mensagemParaAmiga,
  tamanhosDisponiveis,
} from "./vitrine";

describe("vitrine", () => {
  it("lê só filtros válidos", () => {
    expect(
      lerFiltros({
        tamanho: "2 anos",
        publico: "menina",
        categoria: "cat_roupas",
        q: " body ",
        pagina: "3",
      }),
    ).toEqual({
      tamanho: "2 anos",
      publico: "menina",
      categoria: "cat_roupas",
      busca: "body",
      pagina: 3,
    });
    expect(lerFiltros({ tamanho: "XG", publico: "adulto", pagina: "-2" })).toEqual({
      tamanho: undefined,
      publico: undefined,
      categoria: undefined,
      busca: undefined,
      pagina: 1,
    });
  });

  it("monta o link mantendo os filtros e voltando à página 1 ao mudar", () => {
    const f = lerFiltros({ tamanho: "RN", pagina: "2" });
    expect(linkDaVitrine(f)).toBe("/?tamanho=RN");
    expect(linkDaVitrine(f, { pagina: 3 })).toBe("/?tamanho=RN&pagina=3");
    expect(linkDaVitrine(f, { publico: "menino" })).toBe("/?tamanho=RN&publico=menino");
    expect(linkDaVitrine(f, { tamanho: undefined })).toBe("/");
    // Só promoções: ?promocao=1, mantido nos links.
    const p = lerFiltros({ promocao: "1", pagina: "2" });
    expect(p.promocao).toBe(true);
    expect(linkDaVitrine(p, { pagina: 2 })).toBe("/?promocao=1&pagina=2");
    expect(lerFiltros({ promocao: "x" }).promocao).toBeUndefined();
  });

  it("menina e menino incluem as peças unissex", () => {
    expect(generosDoPublico("menina")).toEqual(["feminino", "unissex"]);
    expect(generosDoPublico("menino")).toEqual(["masculino", "unissex"]);
    expect(generosDoPublico()).toEqual([]);
  });

  it("lista os tamanhos com peça na ordem oficial", () => {
    expect(tamanhosDisponiveis(["2 anos", null, "RN", "Prematuro", "RN"])).toEqual(["Prematuro", "RN", "2 anos"]);
  });

  it("endereço da peça em minúsculas", () => {
    expect(enderecoDaPeca("F06-00001")).toBe("/peca/f06-00001");
  });
});

describe("linkWhatsapp", () => {
  it("monta o link com a mensagem pronta", () => {
    expect(linkWhatsapp("+55 (12) 99999-0000", "Oi! Peça F06-00001")).toBe(
      "https://wa.me/5512999990000?text=Oi!%20Pe%C3%A7a%20F06-00001",
    );
  });
  it("sem número configurado, não há link", () => {
    expect(linkWhatsapp(undefined, "x")).toBeUndefined();
    expect(linkWhatsapp("1299990000", "x")).toBeUndefined();
  });
});

describe("número da loja", () => {
  it("é um WhatsApp válido", () => {
    expect(linkWhatsapp("5512981053623", "Oi")).toBe("https://wa.me/5512981053623?text=Oi");
  });
});

describe("mensagemDaPeca", () => {
  it("leva código, nome, tamanho, preço e o link da peça", () => {
    expect(
      mensagemDaPeca(
        {
          codigo: "F45-00005",
          nome: "Tapa Fralda",
          tamanho: "RN",
          preco: "R$ 25,00",
        },
        "https://teste.saltybaby.com.br/",
      ),
    ).toBe(
      "Olá! Tenho interesse nesta peça: F45-00005 · Tapa Fralda · tam. RN · R$ 25,00\nhttps://teste.saltybaby.com.br/peca/f45-00005",
    );
    expect(
      mensagemDaPeca({ codigo: "SB-00001", nome: "Livro", tamanho: null, preco: "R$ 5,00" }, "https://app.saltybaby.com.br"),
    ).toBe("Olá! Tenho interesse nesta peça: SB-00001 · Livro · R$ 5,00\nhttps://app.saltybaby.com.br/peca/sb-00001");
  });

  it("diz de qual grupo a cliente veio", () => {
    expect(mensagemDaPeca({ codigo: "SB-00001", nome: "Livro", tamanho: null, preco: "R$ 5,00" }, "https://x", "Meninas")).toBe(
      "Olá! Tenho interesse nesta peça: SB-00001 · Livro · R$ 5,00\nhttps://x/peca/sb-00001\n(Vi no grupo Meninas)",
    );
  });
});

describe("compartilhar com uma amiga", () => {
  it("monta a mensagem e o link sem número", () => {
    const mensagem = mensagemParaAmiga({ codigo: "F06-00001", nome: "Body", tamanho: "RN", preco: "R$ 25,00" }, "https://x/", "Salty Baby");
    expect(mensagem).toBe("Vi isso aqui na Salty Baby e lembrei de você! 💛\nBody · tam. RN · R$ 25,00\nhttps://x/peca/f06-00001");
    expect(linkCompartilharWhatsapp("Oi & tchau")).toBe("https://wa.me/?text=Oi%20%26%20tchau");
  });
});
