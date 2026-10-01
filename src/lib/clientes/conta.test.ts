import { describe, expect, it } from "vitest";
import { codigoValido, fimDoLink, gerarCodigoDoLink, hashDoCodigo, lerCadastro, lerNovaSenha, lerPerfil, mensagemDoLink } from "./conta";

const cadastro = {
  nome: "  Maria   da Silva ",
  email: " Maria@Email.com ",
  telefone: "(12) 98105-3623",
  senha: "moda2026x",
  confirmacao: "moda2026x",
  privacidade: "sim",
};

describe("cadastro da cliente", () => {
  it("lê nome, e-mail e WhatsApp do jeito que são guardados", () => {
    expect(lerCadastro(cadastro)).toEqual({
      ok: true,
      dados: { nome: "Maria da Silva", email: "maria@email.com", telefone: "12981053623", senha: "moda2026x" },
    });
  });

  it("explica o que falta", () => {
    expect(lerCadastro({ ...cadastro, nome: "" })).toEqual({ ok: false, erro: "Escreva seu nome." });
    expect(lerCadastro({ ...cadastro, email: "maria" })).toEqual({ ok: false, erro: "Confira o e-mail." });
    expect(lerCadastro({ ...cadastro, telefone: "98105-3623" })).toEqual({
      ok: false,
      erro: "Escreva o WhatsApp com DDD, por exemplo (12) 98105-3623.",
    });
    expect(lerCadastro({ ...cadastro, senha: "curta1", confirmacao: "curta1" }).ok).toBe(false);
    expect(lerCadastro({ ...cadastro, confirmacao: "outra2026" })).toEqual({ ok: false, erro: "As duas senhas não são iguais." });
    expect(lerCadastro({ ...cadastro, privacidade: undefined })).toEqual({
      ok: false,
      erro: "Para criar a conta, aceite o aviso de privacidade.",
    });
  });

  it("o perfil não pede senha", () => {
    expect(lerPerfil({ nome: "Ana", email: "ana@x.com", telefone: "5512981053623" })).toEqual({
      ok: true,
      dados: { nome: "Ana", email: "ana@x.com", telefone: "12981053623" },
    });
    expect(lerNovaSenha({ senha: "abc12345", confirmacao: "abc12345" })).toEqual({ ok: true, dados: "abc12345" });
  });
});

describe("link de criar senha", () => {
  it("gera códigos difíceis de adivinhar e guarda só o hash", () => {
    const codigo = gerarCodigoDoLink();
    expect(codigoValido(codigo)).toBe(true);
    expect(gerarCodigoDoLink()).not.toBe(codigo);
    expect(hashDoCodigo(codigo)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashDoCodigo(codigo)).not.toContain(codigo);
    expect(codigoValido("../../etc")).toBe(false);
  });

  it("vale por 7 dias", () => {
    expect(fimDoLink(new Date("2026-10-01T12:00:00Z")).toISOString()).toBe("2026-10-08T12:00:00.000Z");
  });

  it("monta a mensagem para o WhatsApp", () => {
    const m = mensagemDoLink("Maria da Silva", "https://x/criar-senha/abc", true);
    expect(m).toContain("Oi, Maria!");
    expect(m).toContain("Criamos sua conta");
    expect(m).toContain("https://x/criar-senha/abc");
    expect(mensagemDoLink("Maria", "https://x", false)).toContain("nova senha");
  });
});
