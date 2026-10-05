import { describe, expect, it } from "vitest";
import { formatarCpf, lerCrianca, lerFormularioCliente } from "./dados";

describe("cadastro de clientes", () => {
  it("guarda o WhatsApp e o CPF só com os números", () => {
    const r = lerFormularioCliente({ nome: " Ana  ", telefone: "(12) 99876-5432", cpf: "123.456.789-01", email: "ANA@X.COM" });
    expect(r).toEqual({
      ok: true,
      dados: expect.objectContaining({ nome: "Ana", telefone: "12998765432", cpf: "12345678901", email: "ana@x.com", cidade: null }),
    });
  });

  it("recusa nome curto, telefone sem DDD e CPF incompleto", () => {
    expect(lerFormularioCliente({ nome: "A" })).toEqual({ ok: false, erro: "Escreva o nome da cliente." });
    expect(lerFormularioCliente({ nome: "Ana", telefone: "98765-4321" })).toMatchObject({ ok: false });
    expect(lerFormularioCliente({ nome: "Ana", cpf: "123" })).toEqual({ ok: false, erro: "O CPF tem 11 números." });
  });

  it("mantém telefone e CPF antigos fora do padrão enquanto ninguém mexe", () => {
    const atual = { telefone: "12 3881", cpf: "123" };
    const r = lerFormularioCliente({ nome: "Ana", telefone: "12 3881", cpf: "123" }, atual);
    expect(r).toMatchObject({ ok: true, dados: { telefone: "12 3881", cpf: "123" } });
  });

  it("a ajudante não vê nem muda o CPF", () => {
    const r = lerFormularioCliente({ nome: "Ana", cpf: "" }, { cpf: "12345678901" }, false);
    expect(r).toMatchObject({ ok: true, dados: { cpf: "12345678901" } });
  });

  it("formata o CPF", () => {
    expect(formatarCpf("12345678901")).toBe("123.456.789-01");
  });
});

describe("dados da criança", () => {
  const hoje = "2026-09-30";
  it("lê nome, nascimento e sexo", () => {
    expect(lerCrianca({ nome: " Maria  Clara ", nascimento: "2025-03-10", sexo: "feminino" }, hoje)).toEqual({
      ok: true,
      dados: { nome: "Maria Clara", nascimento: new Date("2025-03-10T00:00:00Z"), sexo: "feminino", tamanho: null },
    });
    expect(lerCrianca({ nome: "Theo", nascimento: "", sexo: "" }, hoje)).toEqual({
      ok: true,
      dados: { nome: "Theo", nascimento: null, sexo: null, tamanho: null },
    });
    expect(lerCrianca({ nome: "Theo", tamanho: "2 anos" }, hoje)).toMatchObject({ ok: true, dados: { tamanho: "2 anos" } });
    expect(lerCrianca({ nome: "Theo", tamanho: "99 anos" }, hoje)).toEqual({ ok: false, erro: "Escolha um tamanho da lista." });
  });

  it("recusa sem nome, data no futuro ou muito antiga", () => {
    expect(lerCrianca({ nome: "" }, hoje)).toEqual({ ok: false, erro: "Escreva o nome da criança." });
    expect(lerCrianca({ nome: "Theo", nascimento: "2026-10-01" }, hoje)).toMatchObject({ ok: false });
    expect(lerCrianca({ nome: "Theo", nascimento: "1990-01-01" }, hoje)).toEqual({ ok: false, erro: "Confira o ano de nascimento." });
  });
});
