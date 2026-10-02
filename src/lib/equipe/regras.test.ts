import { describe, expect, it } from "vitest";
import { acessoDaEquipe } from "../permissoes";
import { lerFormularioSuporte, mensagemDoSuporte, mudancasDeAcesso } from "./regras";

describe("lerFormularioSuporte", () => {
  it("guarda o e-mail em minúsculas e o WhatsApp só com números", () => {
    const r = lerFormularioSuporte({ nome: " Joana Lima ", email: "Joana@Email.com ", whatsapp: "(12) 99876-5432" });
    expect(r).toEqual({ ok: true, dados: { nome: "Joana Lima", email: "joana@email.com", whatsapp: "12998765432" } });
  });

  it("WhatsApp é opcional", () => {
    const r = lerFormularioSuporte({ nome: "Joana", email: "joana@email.com", whatsapp: "" });
    expect(r.ok && r.dados.whatsapp).toBeNull();
  });

  it("recusa e-mail e WhatsApp inválidos", () => {
    expect(lerFormularioSuporte({ nome: "Joana", email: "joana", whatsapp: "" })).toMatchObject({ ok: false });
    expect(lerFormularioSuporte({ nome: "Joana", email: "joana@email.com", whatsapp: "123" })).toMatchObject({
      ok: false,
      erro: expect.stringContaining("DDD"),
    });
    expect(lerFormularioSuporte({ nome: "J", email: "joana@email.com" })).toMatchObject({ ok: false });
  });
});

describe("mudancasDeAcesso", () => {
  it("uma linha por página ou ação que mudou", () => {
    const antes = acessoDaEquipe(["ajudante"], [
      { chave: "pecas", nivel: "ver" },
      { chave: "vendas", nivel: "ver" },
    ]);
    const depois = acessoDaEquipe(["ajudante"], [
      { chave: "pecas", nivel: "alterar" },
      { chave: "clientes", nivel: "ver" },
      { chave: "excluir_peca", nivel: "sim" },
    ]);
    expect(mudancasDeAcesso(antes, depois)).toEqual([
      { campo: "Página Peças", antes: "Só ver", depois: "Ver e alterar", restrito: false },
      { campo: "Página Clientes", antes: "Sem acesso", depois: "Só ver", restrito: false },
      { campo: "Página Vendas", antes: "Só ver", depois: "Sem acesso", restrito: false },
      { campo: "Excluir peças", antes: "Não", depois: "Liberado", restrito: false },
    ]);
  });

  it("sem mudança, nada", () => {
    const a = acessoDaEquipe(["ajudante"], [{ chave: "pecas", nivel: "ver" }]);
    expect(mudancasDeAcesso(a, a)).toEqual([]);
  });
});

describe("mensagemDoSuporte", () => {
  it("traz o primeiro nome, a loja e o link", () => {
    const m = mensagemDoSuporte("Joana Lima", "https://loja/criar-senha/abc", "Loja X", true);
    expect(m).toContain("Oi, Joana!");
    expect(m).toContain("Loja X");
    expect(m).toContain("https://loja/criar-senha/abc");
    expect(m).toContain("Criei seu acesso");
    expect(mensagemDoSuporte("Joana", "l", "Loja X", false)).toContain("nova senha");
  });
});
