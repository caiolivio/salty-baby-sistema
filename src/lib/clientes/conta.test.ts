import { describe, expect, it } from "vitest";
import { codigoValido, fimDoLink, gerarCodigoDoLink, hashDoCodigo, lerCadastro, lerEnderecoDoPerfil, lerNovaSenha, lerPerfil, mensagemDoLink } from "./conta";

const cadastro = {
  nome: "  Maria   da Silva ",
  email: " Maria@Email.com ",
  telefone: "(12) 98105-3623",
  senha: "moda2026x",
  confirmacao: "moda2026x",
  privacidade: "sim",
};

const H = "2026-11-05";
const ler = (v: Record<string, unknown>) => lerCadastro(v, H);

describe("cadastro da cliente", () => {
  it("lê nome, e-mail e WhatsApp do jeito que são guardados", () => {
    expect(ler(cadastro)).toEqual({
      ok: true,
      dados: {
        nome: "Maria da Silva",
        email: "maria@email.com",
        telefone: "12981053623",
        senha: "moda2026x",
        aceitaMensagens: false,
        bebe: null,
        indicacao: null,
      },
    });
  });

  it("guarda o aceite das mensagens, o bebê e quem indicou", () => {
    const lido = ler({ ...cadastro, mensagens: "sim", bebeNascimento: "2027-01-20", bebeSexo: "feminino", indicacao: " Abc23xy " });
    expect(lido).toMatchObject({
      ok: true,
      dados: {
        aceitaMensagens: true,
        bebe: { nome: "Bebê", nascimento: new Date("2027-01-20T00:00:00Z"), sexo: "feminino", tamanho: null },
        indicacao: "abc23xy",
      },
    });
    expect(ler({ ...cadastro, bebeNome: "Lis" })).toMatchObject({ ok: true, dados: { bebe: { nome: "Lis", nascimento: null } } });
    expect(ler({ ...cadastro, bebeNascimento: "2030-01-01" })).toMatchObject({ ok: false, erro: expect.stringContaining("Bebê:") });
    expect(ler({ ...cadastro, indicacao: "x" })).toMatchObject({ ok: true, dados: { indicacao: null } });
  });

  it("explica o que falta", () => {
    expect(ler({ ...cadastro, nome: "" })).toEqual({ ok: false, erro: "Escreva seu nome." });
    expect(ler({ ...cadastro, email: "maria" })).toEqual({ ok: false, erro: "Confira o e-mail." });
    expect(ler({ ...cadastro, telefone: "98105-3623" })).toEqual({
      ok: false,
      erro: "Escreva o WhatsApp com DDD, por exemplo (11) 98765-4321.",
    });
    expect(ler({ ...cadastro, senha: "curta1", confirmacao: "curta1" }).ok).toBe(false);
    expect(ler({ ...cadastro, confirmacao: "outra2026" })).toEqual({ ok: false, erro: "As duas senhas não são iguais." });
    expect(ler({ ...cadastro, privacidade: undefined })).toEqual({
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
    expect(m).toContain("Criamos a sua *conta*");
    expect(m).toContain("https://x/criar-senha/abc");
    expect(m).not.toContain("Vídeo");
    expect(mensagemDoLink("Maria", "https://x", false)).toContain("nova senha");
    expect(mensagemDoLink("Maria", "https://x", true, "Salty Baby", "https://x/instalar-app")).toContain(
      "tela inicial do celular, como um aplicativo:\nhttps://x/instalar-app",
    );
  });
});

describe("endereço em Meus dados", () => {
  it("guarda o endereço sem espaços sobrando e deixa vazio como nada", () => {
    expect(lerEnderecoDoPerfil({ endereco: "  Rua A,  10 ", cep: "", cidade: "Caraguatatuba", estado: "SP" })).toEqual({
      ok: true,
      dados: { endereco: "Rua A, 10", cep: null, cidade: "Caraguatatuba", estado: "SP" },
    });
  });

  it("recusa texto longo demais", () => {
    expect(lerEnderecoDoPerfil({ cep: "1".repeat(16) }).ok).toBe(false);
  });
});
