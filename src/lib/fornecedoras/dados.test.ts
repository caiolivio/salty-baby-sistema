import { describe, expect, it } from "vitest";
import { lerFormularioFornecedora, mostrarPercentual, numeroSeguro } from "./dados";

const base = { nome: "Maria Souza" };

describe("numeroSeguro", () => {
  it("segue a sequência (depois da importação F47, a próxima é F48)", () => {
    expect(numeroSeguro(48, 47)).toBe(48);
  });
  it("nunca fica abaixo de um número que já existe", () => {
    expect(numeroSeguro(1, 47)).toBe(48);
  });
  it("nunca reaproveita um número, mesmo que a fornecedora tenha sido excluída", () => {
    expect(numeroSeguro(52, 47)).toBe(52);
  });
  it("começa em 1 com o banco vazio", () => {
    expect(numeroSeguro(1, null)).toBe(1);
  });
});

describe("lerFormularioFornecedora", () => {
  it("aceita só o nome e usa 40% de repasse", () => {
    const r = lerFormularioFornecedora(base);
    expect(r).toEqual({
      ok: true,
      dados: {
        nome: "Maria Souza",
        telefone: null,
        email: null,
        documento: null,
        pix: null,
        pixTipo: null,
        recebimentoPreferido: null,
        endereco: null,
        cep: null,
        cidade: null,
        estado: null,
        percentualRepassePadrao: 4000,
      },
    });
  });

  it("exige o nome", () => {
    expect(lerFormularioFornecedora({ nome: " " })).toEqual({ ok: false, erro: "Escreva o nome da fornecedora." });
  });

  it("guarda CPF e CNPJ só com os números", () => {
    const cpf = lerFormularioFornecedora({ ...base, documento: "123.456.789-09" });
    expect(cpf.ok && cpf.dados.documento).toBe("12345678909");
    const cnpj = lerFormularioFornecedora({ ...base, documento: "12.345.678/0001-95" });
    expect(cnpj.ok && cnpj.dados.documento).toBe("12345678000195");
    expect(lerFormularioFornecedora({ ...base, documento: "123" }).ok).toBe(false);
  });

  it("mantém um CPF incompleto vindo do Notion enquanto ninguém mexer nele", () => {
    const igual = lerFormularioFornecedora({ ...base, documento: "123.456" }, "123456");
    expect(igual.ok && igual.dados.documento).toBe("123456");
    expect(lerFormularioFornecedora({ ...base, documento: "1234567" }, "123456").ok).toBe(false);
  });

  it("lê o percentual de repasse com vírgula ou símbolo", () => {
    const r = (p: string) => {
      const x = lerFormularioFornecedora({ ...base, percentualRepassePadrao: p });
      return x.ok ? x.dados.percentualRepassePadrao : x.erro;
    };
    expect(r("50")).toBe(5000);
    expect(r("37,5%")).toBe(3750);
    expect(r("")).toBe(4000);
    expect(r("0")).toBe(0);
    expect(r("120")).toBe("O repasse vai de 0 a 100%.");
    expect(r("quarenta")).toBe("Escreva o repasse como número, por exemplo 40.");
  });

  it("confere o e-mail e guarda em minúsculas", () => {
    const ok = lerFormularioFornecedora({ ...base, email: " Maria@Email.com " });
    expect(ok.ok && ok.dados.email).toBe("maria@email.com");
    expect(lerFormularioFornecedora({ ...base, email: "maria@" })).toEqual({ ok: false, erro: "Confira o e-mail." });
  });
});

describe("mostrarPercentual", () => {
  it("mostra no formato brasileiro", () => {
    expect(mostrarPercentual(4000)).toBe("40");
    expect(mostrarPercentual(3750)).toBe("37,5");
  });
});
