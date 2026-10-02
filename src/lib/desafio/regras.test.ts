import { describe, expect, it } from "vitest";
import { ALFABETO, assinarDesafio, conferirDesafio, desenharDesafio, gerarTexto, normalizarResposta, TRACOS, VALIDADE_MS } from "./regras";

const segredo = "segredo-de-teste";
const t0 = 1_800_000_000_000;

describe("desafio contra robôs", () => {
  it("sorteia 5 símbolos do alfabeto, todos com desenho", () => {
    const texto = gerarTexto();
    expect(texto).toMatch(new RegExp(`^[${ALFABETO}]{5}$`));
    for (const letra of ALFABETO) expect(TRACOS[letra]).toBeTruthy();
  });

  it("aceita a resposta em minúsculas e com espaços", () => {
    expect(normalizarResposta(" k7 m a3 ")).toBe("K7MA3");
    const ficha = assinarDesafio("K7MA3", segredo, t0);
    expect(conferirDesafio(ficha, "k7ma3", segredo, t0 + 10_000)).toEqual({ ok: true, numero: expect.any(String) });
  });

  it("recusa resposta errada, ficha alterada ou de outro segredo", () => {
    const ficha = assinarDesafio("K7MA3", segredo, t0);
    expect(conferirDesafio(ficha, "K7MA4", segredo, t0 + 10_000)).toEqual({ ok: false, motivo: "errado" });
    expect(conferirDesafio(ficha, "K7MA3", "outro", t0 + 10_000)).toEqual({ ok: false, motivo: "errado" });
    expect(conferirDesafio(`x${ficha}`, "K7MA3", segredo, t0 + 10_000).ok).toBe(false);
    expect(conferirDesafio(undefined, "K7MA3", segredo, t0 + 10_000).ok).toBe(false);
  });

  it("recusa a ficha vencida e o envio rápido demais (robô)", () => {
    const ficha = assinarDesafio("K7MA3", segredo, t0);
    expect(conferirDesafio(ficha, "K7MA3", segredo, t0 + VALIDADE_MS + 1)).toEqual({ ok: false, motivo: "vencido" });
    expect(conferirDesafio(ficha, "K7MA3", segredo, t0 + 500)).toEqual({ ok: false, motivo: "rapido" });
  });

  it("não deixa o texto legível no desenho", () => {
    const svg = desenharDesafio("K7MA3");
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain("K7MA3");
  });
});
