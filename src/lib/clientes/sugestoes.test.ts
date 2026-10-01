import { describe, expect, it } from "vitest";
import { escolherSugestoes, pontosDaPeca, preferenciasDaCliente, proximoTamanho, type Candidata } from "./sugestoes";

const hoje = new Date("2026-10-01T12:00:00Z");
const dias = (n: number) => new Date(hoje.getTime() - n * 86_400_000);
const peca = (id: string, extra: Partial<Candidata> = {}): Candidata => ({
  id,
  tamanho: null,
  categorias: [],
  marca: null,
  dataEntrada: dias(10),
  ...extra,
});

describe("preferências da cliente", () => {
  it("usa o tamanho de agora da criança e o próximo, pela data de nascimento", () => {
    // Nasceu há 7 meses: serve M agora, e G é o próximo.
    const gosto = preferenciasDaCliente({ compras: [], favoritos: [], nascimentos: [dias(213)], hoje });
    expect([...gosto.tamanhos]).toEqual(["M", "G"]);
  });

  it("faz a criança crescer: quem comprou RN há um ano agora veste 1 ano", () => {
    const gosto = preferenciasDaCliente({
      compras: [{ tamanho: "RN", categorias: ["Roupas"], marca: "Fakini", data: dias(365) }],
      favoritos: [],
      hoje,
    });
    expect(gosto.tamanhos.has("RN")).toBe(false);
    expect(gosto.tamanhos.has("1 ano")).toBe(true);
    expect(gosto.tamanhos.has("18 meses")).toBe(true);
    expect([...gosto.categorias]).toEqual(["roupas"]);
    expect([...gosto.marcas]).toEqual(["fakini"]);
  });

  it("conta os tamanhos dos favoritos e das compras recentes", () => {
    const gosto = preferenciasDaCliente({
      compras: [{ tamanho: "4 anos", categorias: [], marca: null, data: dias(20) }],
      favoritos: [{ tamanho: "Calçado 22", categorias: ["Calçados"], marca: " Pampili ", data: dias(1) }],
      hoje,
    });
    expect(gosto.tamanhos.has("4 anos")).toBe(true);
    expect(gosto.categorias.has("calcados")).toBe(true);
    expect(gosto.marcas.has("pampili")).toBe(true);
  });

  it("sabe o tamanho seguinte, pulando o prematuro", () => {
    expect(proximoTamanho("Prematuro")).toBe("RN");
    expect(proximoTamanho("G")).toBe("1 ano");
    expect(proximoTamanho("18 anos")).toBeUndefined();
  });
});

describe("peças sugeridas", () => {
  const gosto = {
    tamanhos: new Set(["2 anos"] as const),
    categorias: new Set(["roupas"]),
    marcas: new Set(["fakini"]),
  };

  it("dá mais pontos para o que bate com tamanho, categoria e marca", () => {
    expect(pontosDaPeca(peca("a", { tamanho: "2 anos", categorias: ["Roupas"], marca: "FAKINI" }), gosto)).toBe(7);
    expect(pontosDaPeca(peca("b", { tamanho: "2 anos" }), gosto)).toBe(3);
    expect(pontosDaPeca(peca("c", { categorias: ["Brinquedos"], marca: "Outra" }), gosto)).toBe(0);
  });

  it("ordena por pontos, depois pela mais nova, e tira as favoritadas", () => {
    const candidatas = [
      peca("so-marca", { marca: "Fakini" }),
      peca("tudo", { tamanho: "2 anos", categorias: ["Roupas"], marca: "Fakini" }),
      peca("tamanho-antiga", { tamanho: "2 anos", dataEntrada: dias(30) }),
      peca("tamanho-nova", { tamanho: "2 anos", dataEntrada: dias(1) }),
      peca("favoritada", { tamanho: "2 anos", categorias: ["Roupas"], marca: "Fakini" }),
      peca("nada"),
    ];
    const r = escolherSugestoes(candidatas, gosto, new Set(["favoritada"]));
    expect(r.personalizadas).toBe(true);
    expect(r.pecas.map((p) => p.id)).toEqual(["tudo", "tamanho-nova", "tamanho-antiga", "so-marca"]);
  });

  it("sem histórico, mostra as novidades", () => {
    const vazio = { tamanhos: new Set<never>(), categorias: new Set<string>(), marcas: new Set<string>() };
    const r = escolherSugestoes([peca("velha", { dataEntrada: dias(50) }), peca("nova", { dataEntrada: dias(2) })], vazio, new Set(), 1);
    expect(r).toEqual({ pecas: [expect.objectContaining({ id: "nova" })], personalizadas: false });
  });
});
