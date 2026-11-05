import { describe, expect, it } from "vitest";
import { emailDeNovaSenha, fimDoLinkPorEmail, lerEmailDoPedido, smtpDoAmbiente } from "./esqueci-senha";

describe("esqueci a senha", () => {
  it("lê o e-mail digitado", () => {
    expect(lerEmailDoPedido("  Carol@SaltyBaby.com.br ")).toBe("carol@saltybaby.com.br");
    expect(lerEmailDoPedido("carol")).toBeNull();
    expect(lerEmailDoPedido(undefined)).toBeNull();
  });

  it("o link vale 1 hora", () => {
    expect(fimDoLinkPorEmail(new Date("2026-11-05T12:00:00Z")).toISOString()).toBe("2026-11-05T13:00:00.000Z");
  });

  it("lê a configuração do SMTP", () => {
    expect(smtpDoAmbiente({})).toBeNull();
    expect(smtpDoAmbiente({ SMTP_HOST: "email-ssl.com.br", SMTP_USUARIO: "nao-responda@loja.com.br" })).toBeNull();
    expect(smtpDoAmbiente({ SMTP_HOST: "email-ssl.com.br", SMTP_USUARIO: "nao-responda@loja.com.br", SMTP_SENHA: "x" })).toEqual({
      host: "email-ssl.com.br",
      porta: 465,
      seguro: true,
      usuario: "nao-responda@loja.com.br",
      senha: "x",
      remetente: "nao-responda@loja.com.br",
    });
    const c = smtpDoAmbiente({ SMTP_HOST: "h", SMTP_USUARIO: "u", SMTP_SENHA: "s", SMTP_PORTA: "587", EMAIL_REMETENTE: "Loja <u@l.com>" });
    expect(c).toMatchObject({ porta: 587, seguro: false, remetente: "Loja <u@l.com>" });
    expect(smtpDoAmbiente({ SMTP_HOST: "h", SMTP_USUARIO: "u", SMTP_SENHA: "s", SMTP_PORTA: "abc" })).toBeNull();
  });

  it("monta o e-mail sem deixar o nome virar HTML", () => {
    const e = emailDeNovaSenha({ nome: "Ana <b>Carolina</b>", link: "https://app.loja.com.br/criar-senha/abc", loja: "Salty Baby" });
    expect(e.assunto).toBe("Salty Baby: link para criar uma nova senha");
    expect(e.texto).toContain("Olá, Ana!");
    expect(e.texto).toContain("https://app.loja.com.br/criar-senha/abc");
    expect(e.html).toContain('href="https://app.loja.com.br/criar-senha/abc"');
    expect(emailDeNovaSenha({ nome: "<x>", link: "l", loja: "L" }).html).toContain("&lt;x&gt;");
  });
});
