import { describe, expect, it } from "vitest";
import { etapaDaFornecedora, lerDadosDaFornecedora, mensagemDoConvite } from "./conta";

const base = { nome: " Ana Souza ", email: "Ana@Mail.com", telefone: "", endereco: "Rua A, 1 - Centro", pix: "" };

describe("dados da fornecedora", () => {
  it("exige nome, e-mail e endereço; o resto é opcional", () => {
    const lido = lerDadosDaFornecedora(base);
    expect(lido).toEqual({
      ok: true,
      dados: {
        nome: "Ana Souza",
        email: "ana@mail.com",
        telefone: null,
        endereco: "Rua A, 1 - Centro",
        cep: null,
        cidade: null,
        estado: null,
        pix: null,
      },
    });
    expect(lerDadosDaFornecedora({ ...base, email: "" })).toEqual({
      ok: false,
      erro: "Escreva seu e-mail. Ele é obrigatório para entrar na sua área.",
    });
    expect(lerDadosDaFornecedora({ ...base, endereco: "" }).ok).toBe(false);
    expect(lerDadosDaFornecedora({ ...base, telefone: "123" }).ok).toBe(false);
    const comWhats = lerDadosDaFornecedora({ ...base, telefone: "(12) 99876-5432" });
    expect(comWhats.ok && comWhats.dados.telefone).toBe("12998765432");
  });
  it("mensagem do convite leva o link", () => {
    const m = mensagemDoConvite("Ana Souza", "https://x/convite/abc");
    expect(m.startsWith("Oi, Ana!")).toBe(true);
    expect(m.endsWith("https://x/convite/abc")).toBe(true);
  });
});

describe("etapa do cadastro", () => {
  const ok = { nome: "Ana", email: "a@b.com", endereco: "Rua 1", termosAceitosEm: new Date(), boasVindasEm: new Date() };
  it("dados obrigatórios, depois acordo, depois parabéns", () => {
    expect(etapaDaFornecedora({ ...ok, email: null })).toBe("dados");
    expect(etapaDaFornecedora({ ...ok, endereco: " ", termosAceitosEm: null })).toBe("dados");
    expect(etapaDaFornecedora({ ...ok, termosAceitosEm: null })).toBe("acordo");
    expect(etapaDaFornecedora({ ...ok, boasVindasEm: null })).toBe("parabens");
    expect(etapaDaFornecedora(ok)).toBe("liberada");
  });
});
