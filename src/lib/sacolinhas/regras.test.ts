import { describe, expect, it } from "vitest";
import {
  avisoDeDoacao,
  enderecoDeEntrega,
  explicacaoDaSacolinha,
  estaParaDoar,
  lerPrazo,
  mensagemDoAviso,
  mensagemPedirEnvio,
  prazoDaSacolinha,
  precisaDeAviso,
  situacaoDoPrazo,
  tamanhoMaisComum,
  textoDoPrazo,
} from "./regras";

const dia = (d: string) => new Date(`${d}T00:00:00Z`);

describe("prazo da sacolinha", () => {
  it("vale 3 meses a partir da primeira peça", () => {
    expect(prazoDaSacolinha("2026-10-05")).toBe("2027-01-05");
    expect(prazoDaSacolinha("2026-11-30")).toBe("2027-02-28");
    expect(prazoDaSacolinha("2026-10-05", 1)).toBe("2026-11-05");
  });

  it("conta os dias que faltam e os que passaram", () => {
    expect(situacaoDoPrazo(dia("2026-10-15"), "2026-10-05")).toEqual({ tipo: "no-prazo", dias: 10 });
    expect(situacaoDoPrazo(dia("2026-10-05"), "2026-10-05")).toEqual({ tipo: "vence-hoje" });
    expect(situacaoDoPrazo(dia("2026-10-01"), "2026-10-05")).toEqual({ tipo: "vencida", dias: 4 });
  });

  it("escreve o prazo para a tela", () => {
    expect(textoDoPrazo(dia("2026-10-06"), "2026-10-05")).toBe("Falta 1 dia (até 06/10/2026)");
    expect(textoDoPrazo(dia("2026-10-15"), "2026-10-05")).toBe("Faltam 10 dias (até 15/10/2026)");
    expect(textoDoPrazo(dia("2026-10-05"), "2026-10-05")).toBe("Vence hoje (05/10/2026)");
    expect(textoDoPrazo(dia("2026-10-01"), "2026-10-05")).toBe("Venceu em 01/10/2026");
  });

  it("deixa claro que as peças são doadas", () => {
    expect(avisoDeDoacao(dia("2027-01-05"), "Salty")).toBe(
      "Se o envio não for pedido até 05/01/2027, as peças da sacolinha serão doadas pela Salty.",
    );
  });

  it("só vai para a lista a doar depois de vencida e se ainda está aberta", () => {
    expect(estaParaDoar({ situacao: "aberta", prazo: dia("2026-10-04") }, "2026-10-05")).toBe(true);
    expect(estaParaDoar({ situacao: "aberta", prazo: dia("2026-10-05") }, "2026-10-05")).toBe(false);
    expect(estaParaDoar({ situacao: "envio_pedido", prazo: dia("2026-10-01") }, "2026-10-05")).toBe(false);
  });

  it("aceita um prazo novo só entre hoje e 2 anos", () => {
    expect(lerPrazo("2026-12-01", "2026-10-05")).toEqual({ ok: true, prazo: "2026-12-01" });
    expect(lerPrazo("2026-10-04", "2026-10-05").ok).toBe(false);
    expect(lerPrazo("2029-01-01", "2026-10-05").ok).toBe(false);
    expect(lerPrazo("", "2026-10-05").ok).toBe(false);
  });
});

describe("aviso semanal", () => {
  const agora = new Date("2026-10-12T15:00:00Z");
  it("sai uma vez por semana, contando da abertura ou do último aviso", () => {
    expect(precisaDeAviso({ abertaEm: new Date("2026-10-05T14:00:00Z"), ultimoAvisoEm: null }, agora)).toBe(true);
    expect(precisaDeAviso({ abertaEm: new Date("2026-10-08T14:00:00Z"), ultimoAvisoEm: null }, agora)).toBe(false);
    expect(
      precisaDeAviso({ abertaEm: new Date("2026-09-01T14:00:00Z"), ultimoAvisoEm: new Date("2026-10-10T14:00:00Z") }, agora),
    ).toBe(false);
  });

  it("monta a mensagem com as peças, o prazo, a doação, as novidades e o atalho", () => {
    const texto = mensagemDoAviso({
      nomeCliente: "Ana Paula Souza",
      nomeCurto: "Salty",
      pecas: [
        { codigo: "F03-00001", nome: "Vestido", tamanho: "2 anos" },
        { codigo: "SB-00004", nome: "Livro", tamanho: null },
      ],
      prazo: dia("2026-11-05"),
      hoje: "2026-10-12",
      novidades: { quantidade: 3, tamanho: "2 anos", link: "https://app.saltybaby.com.br/?tamanho=2+anos" },
      linkSacolinha: "https://app.saltybaby.com.br/minha-conta/sacolinha",
    });
    expect(texto).toBe(
      [
        "Oi, Ana! Aqui é da Salty. Sua sacolinha está guardada com a gente:",
        "",
        "• F03-00001 · Vestido · tam. 2 anos",
        "• SB-00004 · Livro",
        "",
        "Faltam 24 dias para pedir o envio (até 05/11/2026).",
        "Se o envio não for pedido até 05/11/2026, as peças da sacolinha serão doadas pela Salty.",
        "",
        "Chegaram 3 peças novas no tamanho 2 anos esta semana:",
        "https://app.saltybaby.com.br/?tamanho=2+anos",
        "",
        "Para pedir o envio (o frete é por sua conta), é só tocar aqui: https://app.saltybaby.com.br/minha-conta/sacolinha",
      ].join("\n"),
    );
  });

  it("não fala de novidades quando não chegou nada", () => {
    const texto = mensagemDoAviso({
      nomeCliente: "Bia",
      nomeCurto: "Salty",
      pecas: [{ codigo: "F03-00001", nome: "Vestido", tamanho: "2 anos" }],
      prazo: dia("2026-10-12"),
      hoje: "2026-10-12",
      novidades: { quantidade: 0, tamanho: "2 anos", link: "x" },
      linkSacolinha: "l",
    });
    expect(texto).not.toContain("Chegaram");
    expect(texto).toContain("Hoje (12/10/2026) é o último dia para pedir o envio.");
  });
});

describe("pedido de envio", () => {
  it("leva as peças e o endereço da ficha", () => {
    const endereco = enderecoDeEntrega({ endereco: "Rua A, 10", cidade: "Caraguatatuba", estado: "SP", cep: "11660-000" });
    expect(endereco).toBe("Rua A, 10, Caraguatatuba-SP, CEP 11660-000");
    expect(enderecoDeEntrega({ endereco: " ", cidade: "X", estado: null, cep: null })).toBeNull();
    const texto = mensagemPedirEnvio({ nomeCliente: "Bia", pecas: [{ codigo: "F03-00001", nome: "Vestido", tamanho: "2 anos" }], endereco });
    expect(texto).toBe(
      [
        "Olá! Sou Bia e quero pedir o envio da minha sacolinha:",
        "",
        "• F03-00001 · Vestido · tam. 2 anos",
        "",
        "Endereço: Rua A, 10, Caraguatatuba-SP, CEP 11660-000",
        "Qual é o valor do frete?",
      ].join("\n"),
    );
    expect(mensagemPedirEnvio({ nomeCliente: "Bia", pecas: [], endereco: null })).toContain("Vou mandar o endereço de entrega.");
  });

  it("acha o tamanho mais comum", () => {
    expect(tamanhoMaisComum([{ tamanho: "2 anos" }, { tamanho: "3 anos" }, { tamanho: "3 anos" }, { tamanho: null }])).toBe("3 anos");
    expect(tamanhoMaisComum([{ tamanho: null }])).toBeNull();
  });
});

describe("explicação da sacolinha", () => {
  it("conta que dá para juntar pedidos e pagar um frete só, com o prazo e a doação", () => {
    const texto = explicacaoDaSacolinha("Salty", 3).join(" ");
    expect(texto).toContain("juntando vários pedidos");
    expect(texto).toContain("um frete só");
    expect(texto).toContain("O prazo é de 3 meses");
    expect(texto).toContain("doadas");
  });
});
