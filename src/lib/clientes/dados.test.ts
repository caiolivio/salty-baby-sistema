import { describe, expect, it } from "vitest";
import { formatarCpf, lerFormularioCliente } from "./dados";

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
