import { describe, expect, it } from "vitest";
import { contraste, cssDasCores, LOJA_PADRAO, lerFormularioLoja, nomeComSlogan, whatsappNaTela } from "./regras";

const formulario = {
  nome: "Salty Baby",
  nomeCurto: "Salty",
  slogan: "Moda Sustentável",
  descricao: "Brechó infantil em Caraguatatuba-SP",
  whatsapp: "(12) 98105-3623",
  instagram: "",
  corDestaque: "#32afb5",
  corPrincipal: "#13506e",
  corTexto: "#13212b",
  prefixoLoja: "sb",
  repassePadrao: "40",
  minutosReserva: "15",
  mesesDevolucao: "6",
};

describe("lerFormularioLoja", () => {
  it("lê e normaliza: WhatsApp com 55, cores em maiúsculas, prefixo e repasse", () => {
    const r = lerFormularioLoja(formulario);
    expect(r).toEqual({
      ok: true,
      dados: {
        ...formulario,
        whatsapp: "5512981053623",
        instagram: null,
        corDestaque: "#32AFB5",
        corPrincipal: "#13506E",
        corTexto: "#13212B",
        prefixoLoja: "SB",
        repassePadrao: 4000,
        minutosReserva: 15,
        mesesDevolucao: 6,
      },
    });
  });

  it("aceita o Instagram como @perfil ou link", () => {
    for (const instagram of ["@saltybaby", "saltybaby", "https://www.instagram.com/saltybaby/"]) {
      const r = lerFormularioLoja({ ...formulario, instagram });
      expect(r.ok && r.dados.instagram).toBe("saltybaby");
    }
    expect(lerFormularioLoja({ ...formulario, instagram: "nome com espaço" }).ok).toBe(false);
  });

  it("recusa WhatsApp sem DDD, prefixo com número e regras fora da faixa", () => {
    expect(lerFormularioLoja({ ...formulario, whatsapp: "98105-3623" })).toMatchObject({ ok: false, erro: /DDD/ });
    expect(lerFormularioLoja({ ...formulario, prefixoLoja: "F1" })).toMatchObject({ ok: false, erro: /prefixo/ });
    expect(lerFormularioLoja({ ...formulario, prefixoLoja: "S" }).ok).toBe(false);
    expect(lerFormularioLoja({ ...formulario, repassePadrao: "120" }).ok).toBe(false);
    expect(lerFormularioLoja({ ...formulario, minutosReserva: "2" }).ok).toBe(false);
    expect(lerFormularioLoja({ ...formulario, mesesDevolucao: "-1" }).ok).toBe(false);
    expect(lerFormularioLoja({ ...formulario, nome: "" }).ok).toBe(false);
  });

  it("recusa cor principal ou de texto clara demais para ler no branco", () => {
    expect(lerFormularioLoja({ ...formulario, corPrincipal: "#32AFB5" })).toMatchObject({ ok: false, erro: /principal/ });
    expect(lerFormularioLoja({ ...formulario, corTexto: "#cccccc" })).toMatchObject({ ok: false, erro: /texto/ });
    // O destaque pode ser claro: é só para ícones.
    expect(lerFormularioLoja({ ...formulario, corDestaque: "#ffe000" }).ok).toBe(true);
  });

  it("com peças da loja já cadastradas, o prefixo fica o mesmo", () => {
    const r = lerFormularioLoja({ ...formulario, prefixoLoja: "XY" }, "SB");
    expect(r.ok && r.dados.prefixoLoja).toBe("SB");
  });
});

describe("cores e textos", () => {
  it("calcula o contraste como o WCAG", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contraste("#13506E", "#FFFFFF")).toBeGreaterThan(4.5);
    expect(contraste("#32AFB5", "#FFFFFF")).toBeLessThan(4.5);
  });

  it("monta as variáveis de cor só com cores válidas", () => {
    expect(cssDasCores(LOJA_PADRAO)).toBe(":root{--turquesa:#32AFB5;--petroleo:#13506E;--tinta:#13212B}");
    expect(cssDasCores({ ...LOJA_PADRAO, corTexto: "red;}body{display:none" })).toBe("");
  });

  it("mostra o WhatsApp e o nome com slogan", () => {
    expect(whatsappNaTela("5512981053623")).toBe("(12) 98105-3623");
    expect(nomeComSlogan(LOJA_PADRAO)).toBe("Salty Baby · Moda Sustentável");
    expect(nomeComSlogan({ nome: "Loja X", slogan: null })).toBe("Loja X");
  });
});
