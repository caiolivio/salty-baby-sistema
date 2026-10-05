import { describe, expect, it } from "vitest";
import { formatarReais } from "../dinheiro";
import { descricaoDoAlerta, lerAlerta, mensagemDoAlerta, mesmoAlerta, pecaAtende } from "./regras";

const vazio = { tamanho: null, publico: null, categoriaId: null, marca: null };
const peca = { tamanho: "2 anos", genero: "feminino", marca: "Zara Kids", categorias: ["roupas"] };

describe("peça combina com o alerta", () => {
  it("confere cada escolha", () => {
    expect(pecaAtende({ ...vazio, tamanho: "2 anos" }, peca)).toBe(true);
    expect(pecaAtende({ ...vazio, tamanho: "3 anos" }, peca)).toBe(false);
    expect(pecaAtende({ ...vazio, categoriaId: "roupas" }, peca)).toBe(true);
    expect(pecaAtende({ ...vazio, categoriaId: "livros" }, peca)).toBe(false);
    expect(pecaAtende({ ...vazio, tamanho: "2 anos", categoriaId: "livros" }, peca)).toBe(false);
  });

  it("menina e menino seguem a vitrine: unissex e sem gênero entram nos dois", () => {
    expect(pecaAtende({ ...vazio, publico: "menina" }, peca)).toBe(true);
    expect(pecaAtende({ ...vazio, publico: "menino" }, peca)).toBe(false);
    expect(pecaAtende({ ...vazio, publico: "menino" }, { ...peca, genero: "unissex" })).toBe(true);
    expect(pecaAtende({ ...vazio, publico: "menino" }, { ...peca, genero: null })).toBe(true);
  });

  it("marca sem diferença de acento, maiúscula ou espaço", () => {
    expect(pecaAtende({ ...vazio, marca: " zara  kids" }, peca)).toBe(true);
    expect(pecaAtende({ ...vazio, marca: "Zará Kids" }, peca)).toBe(true);
    expect(pecaAtende({ ...vazio, marca: "Zara" }, peca)).toBe(false);
    expect(pecaAtende({ ...vazio, marca: "Zara" }, { ...peca, marca: null })).toBe(false);
  });
});

describe("formulário do alerta", () => {
  it("pede pelo menos uma escolha", () => {
    expect(lerAlerta({}).ok).toBe(false);
    expect(lerAlerta({ tamanho: "99 anos" }).ok).toBe(false);
    expect(lerAlerta({ tamanho: "2 anos", publico: "menina", marca: "  Zara   Kids " })).toEqual({
      ok: true,
      alerta: { tamanho: "2 anos", publico: "menina", categoriaId: null, marca: "Zara Kids" },
    });
    expect(lerAlerta({ publico: "outro", categoria: "c1" })).toEqual({
      ok: true,
      alerta: { tamanho: null, publico: null, categoriaId: "c1", marca: null },
    });
  });

  it("reconhece alerta repetido", () => {
    expect(mesmoAlerta({ ...vazio, marca: "Zara" }, { ...vazio, marca: "zará" })).toBe(true);
    expect(mesmoAlerta({ ...vazio, tamanho: "2 anos" }, { ...vazio, tamanho: "3 anos" })).toBe(false);
  });

  it("descreve o alerta", () => {
    expect(descricaoDoAlerta({ tamanho: "2 anos", publico: "menina", categoriaId: "c1", marca: "Zara" }, "Vestidos")).toBe(
      "Tamanho 2 anos · Menina · Vestidos · Marca Zara",
    );
  });
});

describe("mensagem do aviso", () => {
  const p = (n: number) => ({ nome: `Peça ${n}`, tamanho: "2 anos", precoCentavos: 3000, link: `https://x/peca/${n}` });

  it("lista as peças com link", () => {
    expect(mensagemDoAlerta({ nomeCliente: "Ana Paula", nomeCurto: "Salty", pecas: [p(1)], linkAlertas: "https://x/a" })).toBe(
      [
        "Oi, Ana! Aqui é da Salty. Chegou uma peça do jeito que você pediu para avisar:",
        "",
        `• Peça 1 · tam. 2 anos · ${formatarReais(3000)}`,
        "  https://x/peca/1",
        "",
        "Cada peça é única. Se gostar, é só tocar no link e fechar o pedido!",
        "Para mudar os seus avisos: https://x/a",
      ].join("\n"),
    );
  });

  it("mostra até 10 peças e manda o resto para a página", () => {
    const texto = mensagemDoAlerta({
      nomeCliente: "Bia",
      nomeCurto: "Salty",
      pecas: Array.from({ length: 12 }, (_, i) => p(i + 1)),
      linkAlertas: "https://x/a",
    });
    expect(texto).toContain("Chegaram peças");
    expect(texto).toContain("Peça 10");
    expect(texto).not.toContain("Peça 11");
    expect(texto).toContain("E mais 2 peças: https://x/a");
  });
});
