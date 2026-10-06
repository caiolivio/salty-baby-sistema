import { describe, expect, it } from "vitest";
import { lerDadosDaCandidata, lerInscricao, lerProposta, mensagemDeAprovacao, passoDaEtapa, situacaoDosPassos } from "./candidatura";

const dados = {
  nome: " Joana Lima ",
  email: "Joana@Email.com",
  telefone: "(12) 99111-2222",
  endereco: "Rua das Flores, 10 - Centro",
  cep: "",
  cidade: "Caraguatatuba",
  estado: "SP",
  resumo: "sim",
};
const peca = (descricao: string, temFoto = true) => ({ descricao, temFoto });

describe("inscrição (passo 1)", () => {
  it("lê os dados e as peças com foto", () => {
    const r = lerInscricao(dados, [peca(" Vestido azul 2 anos "), peca("", false), peca("Body RN")]);
    expect(r).toEqual({
      ok: true,
      dados: {
        nome: "Joana Lima",
        email: "joana@email.com",
        telefone: "12991112222",
        endereco: "Rua das Flores, 10 - Centro",
        cep: null,
        cidade: "Caraguatatuba",
        estado: "SP",
        pecas: ["Vestido azul 2 anos", "Body RN"],
      },
    });
  });

  it("pede endereço, pelo menos uma peça, foto em cada peça e no máximo 5", () => {
    expect(lerInscricao({ ...dados, endereco: "" }, [peca("x")])).toEqual({ ok: false, erro: "Escreva seu endereço." });
    expect(lerInscricao(dados, [])).toEqual({ ok: false, erro: "Mostre pelo menos uma peça, com foto e descrição." });
    expect(lerInscricao(dados, [peca("Body"), peca("Vestido", false)])).toEqual({ ok: false, erro: "Falta a foto da peça 2." });
    expect(lerInscricao(dados, [peca("")])).toEqual({ ok: false, erro: "Escreva uma descrição curta da peça 1." });
    expect(lerInscricao(dados, Array.from({ length: 6 }, () => peca("Body")))).toEqual({
      ok: false,
      erro: "Nesta primeira etapa, mostre no máximo 5 peças.",
    });
    expect(lerInscricao({ ...dados, resumo: "" }, [peca("Body")]).ok).toBe(false);
  });
});

describe("peça proposta (passo 2)", () => {
  it("lê os detalhes e exige foto", () => {
    const valores = { nome: "Vestido", descricao: "Florido", tamanho: "2 anos", genero: "feminino", conservacao: "seminova" };
    expect(lerProposta(valores, true)).toEqual({
      ok: true,
      dados: { ...valores, marca: null, categoriaId: null },
    });
    expect(lerProposta(valores, false)).toEqual({ ok: false, erro: "Inclua uma foto da peça." });
    expect(lerProposta({ ...valores, tamanho: "XG" }, true)).toEqual({ ok: false, erro: "Escolha um tamanho da lista." });
  });
});

describe("passos na tela", () => {
  it("marca os passos feitos, o atual e os que faltam", () => {
    expect(situacaoDosPassos(1)).toEqual(["atual", "pendente", "pendente"]);
    expect(situacaoDosPassos(2, true)).toEqual(["feito", "feito", "pendente"]);
    expect(situacaoDosPassos(3, true)).toEqual(["feito", "feito", "feito"]);
  });

  it("liga cada etapa da candidatura a um passo", () => {
    expect(passoDaEtapa("enviada")).toEqual({ atual: 1, concluido: true });
    expect(passoDaEtapa("aprovada")).toEqual({ atual: 2, concluido: false });
    expect(passoDaEtapa("acordo_aceito")).toEqual({ atual: 2, concluido: true });
    expect(passoDaEtapa("efetivada")).toEqual({ atual: 3, concluido: false });
  });
});

describe("mensagem de aprovação", () => {
  it("chama pelo primeiro nome e leva o link", () => {
    const texto = mensagemDeAprovacao("  Maria Clara Souza", "https://teste.saltybaby.com.br/criar-senha/abc", true);
    expect(texto.startsWith("Oi, Maria! Aqui é da Salty Baby")).toBe(true);
    expect(texto).toContain("passo 2");
    expect(texto).toContain("criar sua senha");
    expect(texto.endsWith("https://teste.saltybaby.com.br/criar-senha/abc")).toBe(true);
    expect(mensagemDeAprovacao("Ana", "x", false)).toContain("nova senha");
  });
});

describe("dados da candidata", () => {
  it("lê os dados sem as peças nem o resumo", () => {
    const r = lerDadosDaCandidata({ ...dados, resumo: "" });
    expect(r.ok && r.dados).toMatchObject({ nome: "Joana Lima", email: "joana@email.com", telefone: "12991112222", cep: null });
  });

  it("confere o e-mail", () => {
    expect(lerDadosDaCandidata({ ...dados, email: "joana" }).ok).toBe(false);
  });
});
