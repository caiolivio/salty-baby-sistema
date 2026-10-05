import { describe, expect, it } from "vitest";
import {
  assinarAbertura,
  cnpjValido,
  conferirAbertura,
  conteudoGuardado,
  cpfValido,
  hashDoTexto,
  lerAceiteDoContrato,
  lerChavePix,
  lerLidoEm,
  textoDoCheckbox,
  textoParaGuardar,
} from "./contrato";

const base = {
  lido: "sim",
  nome: " Ana   Paula Souza ",
  documento: "529.982.247-25",
  telefone: "(12) 98765-4321",
  email: "Ana@Exemplo.com",
  pix: "ana@exemplo.com",
  pixTipo: "email",
  recebimento: "pix",
  de_acordo: "sim",
};

describe("CPF e CNPJ", () => {
  it("confere os dígitos", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("1234")).toBe(false);
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-80")).toBe(false);
  });
});

describe("chave Pix pelo tipo", () => {
  it("guarda só o que importa e recusa o que não combina", () => {
    expect(lerChavePix("cpf", "529.982.247-25")).toEqual({ ok: true, chave: "52998224725" });
    expect(lerChavePix("cpf", "123")).toMatchObject({ ok: false });
    expect(lerChavePix("telefone", "+55 (12) 98765-4321")).toEqual({ ok: true, chave: "12987654321" });
    expect(lerChavePix("email", " Ana@X.com ")).toEqual({ ok: true, chave: "ana@x.com" });
    expect(lerChavePix("email", "ana")).toMatchObject({ ok: false });
    expect(lerChavePix("aleatoria", "123E4567-E89B-12D3-A456-426614174000")).toEqual({
      ok: true,
      chave: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(lerChavePix("aleatoria", "abc")).toMatchObject({ ok: false });
  });
});

describe("lerAceiteDoContrato", () => {
  it("lê e arruma os dados", () => {
    expect(lerAceiteDoContrato(base)).toEqual({
      ok: true,
      dados: {
        nome: "Ana Paula Souza",
        documento: "52998224725",
        telefone: "12987654321",
        email: "ana@exemplo.com",
        pix: "ana@exemplo.com",
        pixTipo: "email",
        recebimentoPreferido: "pix",
      },
    });
  });

  it("não aceita sem ler o contrato até o fim, mesmo com o checkbox marcado", () => {
    expect(lerAceiteDoContrato({ ...base, lido: "" })).toEqual({
      ok: false,
      erro: "Leia o contrato até o fim antes de aceitar.",
    });
  });

  it("exige o checkbox, nome completo, CPF válido e WhatsApp", () => {
    expect(lerAceiteDoContrato({ ...base, de_acordo: "" })).toMatchObject({ ok: false });
    expect(lerAceiteDoContrato({ ...base, nome: "Ana" })).toEqual({ ok: false, erro: "Escreva o seu nome completo." });
    expect(lerAceiteDoContrato({ ...base, documento: "123.456.789-00" })).toMatchObject({ ok: false });
    expect(lerAceiteDoContrato({ ...base, telefone: "1234" })).toMatchObject({ ok: false });
  });

  it("a chave Pix é obrigatória só para quem prefere receber por Pix", () => {
    expect(lerAceiteDoContrato({ ...base, pix: "", pixTipo: "" })).toEqual({
      ok: false,
      erro: "Escreva a sua chave Pix para receber os repasses.",
    });
    expect(lerAceiteDoContrato({ ...base, pix: "", pixTipo: "", recebimento: "credito" })).toMatchObject({
      ok: true,
      dados: { pix: null, pixTipo: null, recebimentoPreferido: "credito" },
    });
    expect(lerAceiteDoContrato({ ...base, pixTipo: "" })).toEqual({ ok: false, erro: "Escolha o tipo da chave Pix." });
    expect(lerAceiteDoContrato({ ...base, pixTipo: "cpf" })).toMatchObject({ ok: false });
    expect(lerAceiteDoContrato({ ...base, recebimento: "" })).toMatchObject({ ok: false });
  });
});

describe("evidências", () => {
  const texto = textoParaGuardar("Contrato", "## 1. Objeto\nTexto.");

  it("hash muda com qualquer letra", () => {
    expect(hashDoTexto(texto)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashDoTexto(texto)).not.toBe(hashDoTexto(texto.replace("Texto", "texto")));
    expect(conteudoGuardado(texto)).toBe("## 1. Objeto\nTexto.\n");
  });

  it("abertura assinada: mesma pessoa, mesmo texto e até 24 horas", () => {
    const hash = hashDoTexto(texto);
    const aberto = Date.UTC(2026, 9, 5, 12);
    const campo = assinarAbertura("segredo", "u1", hash, aberto);
    expect(conferirAbertura("segredo", "u1", hash, campo, aberto + 60_000)).toEqual({ ok: true, abertoEm: new Date(aberto) });
    expect(conferirAbertura("segredo", "u2", hash, campo, aberto)).toEqual({ ok: false, motivo: "mudou" });
    expect(conferirAbertura("segredo", "u1", hashDoTexto("outro"), campo, aberto)).toEqual({ ok: false, motivo: "mudou" });
    expect(conferirAbertura("segredo", "u1", hash, campo.replace(/^\d+/, String(aberto - 1)), aberto)).toEqual({
      ok: false,
      motivo: "mudou",
    });
    expect(conferirAbertura("segredo", "u1", hash, campo, aberto + 25 * 3_600_000)).toEqual({ ok: false, motivo: "venceu" });
    expect(conferirAbertura("segredo", "u1", hash, "", aberto)).toEqual({ ok: false, motivo: "mudou" });
  });

  it("hora em que chegou ao fim só vale entre a abertura e agora", () => {
    const aberto = new Date(Date.UTC(2026, 9, 5, 12));
    const agora = new Date(aberto.getTime() + 600_000);
    expect(lerLidoEm(String(aberto.getTime() + 300_000), aberto, agora)).toEqual(new Date(aberto.getTime() + 300_000));
    expect(lerLidoEm(String(aberto.getTime() - 3_600_000), aberto, agora)).toBeNull();
    expect(lerLidoEm("abc", aberto, agora)).toBeNull();
  });

  it("texto do checkbox com o nome da loja", () => {
    expect(textoDoCheckbox("Salty Baby")).toBe(
      "Li e concordo integralmente com o Contrato de Consignação da Salty Baby, inclusive com as regras de curadoria, precificação, promoções, prazos, retirada, doação de itens não selecionados e repasses.",
    );
  });
});
