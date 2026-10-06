import { describe, expect, it } from "vitest";
import { condicaoDaBusca, filtrandoPecas, lerBuscaDePecas, linkDaBuscaDePecas, resumoDaBusca } from "./busca";

describe("busca de peças no painel", () => {
  it("lê só filtros válidos", () => {
    expect(lerBuscaDePecas({ q: " nike ", categoria: "cat1", tamanho: "2 anos", status: "vendida", pagina: "3" })).toEqual({
      busca: "nike",
      categoria: "cat1",
      tamanho: "2 anos",
      status: "vendida",
      pagina: 3,
    });
    const vazia = lerBuscaDePecas({ tamanho: "XG", status: "sumida", pagina: "-1", categoria: "" });
    expect(vazia).toEqual({ pagina: 1 });
    expect(filtrandoPecas(vazia)).toBe(false);
    expect(filtrandoPecas(lerBuscaDePecas({ tamanho: "RN" }))).toBe(true);
  });

  it("monta o link mantendo os filtros e voltando à página 1 ao mudar", () => {
    const f = lerBuscaDePecas({ categoria: "cat1", tamanho: "2 anos", pagina: "4" });
    expect(linkDaBuscaDePecas(f, { pagina: 5 })).toBe("/painel/pecas?categoria=cat1&tamanho=2+anos&pagina=5");
    expect(linkDaBuscaDePecas(f, { status: "publicada" })).toBe("/painel/pecas?categoria=cat1&tamanho=2+anos&status=publicada");
    expect(linkDaBuscaDePecas({ pagina: 1 })).toBe("/painel/pecas");
  });

  it("filtra só pela categoria ou pelo tamanho, sem texto", () => {
    expect(condicaoDaBusca({ categoria: "cat1", pagina: 1 })).toEqual({ categorias: { some: { categoriaId: "cat1" } } });
    expect(condicaoDaBusca({ tamanho: "2 anos", pagina: 1 })).toEqual({ tamanho: "2 anos" });
    expect(condicaoDaBusca({ pagina: 1 })).toEqual({});
  });

  it("separa À venda de Não listado", () => {
    expect(condicaoDaBusca({ status: "publicada", pagina: 1 })).toEqual({ status: "publicada", naoListada: false });
    expect(condicaoDaBusca({ status: "nao_listada", pagina: 1 })).toEqual({ status: "publicada", naoListada: true });
    expect(condicaoDaBusca({ status: "baixa", pagina: 1 })).toEqual({ status: "baixa" });
  });

  it("soma o texto com os filtros", () => {
    const c = condicaoDaBusca({ busca: "f06", tamanho: "2 anos", pagina: 1 });
    expect(c.tamanho).toBe("2 anos");
    expect(c.OR).toContainEqual({ fornecedora: { codigo: "F06" } });
    expect(c.OR).toContainEqual({ marca: { contains: "f06" } });
  });

  it("descreve o que está filtrado", () => {
    expect(resumoDaBusca(12, { tamanho: "2 anos", status: "publicada", busca: "nike", pagina: 1 }, "Calçados")).toBe(
      '12 peças em Calçados, tamanho 2 anos, status À venda, com "nike".',
    );
    expect(resumoDaBusca(1, { pagina: 1 })).toBe("1 peça.");
  });
});
