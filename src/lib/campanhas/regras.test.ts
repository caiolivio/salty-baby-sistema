import { describe, expect, it } from "vitest";
import {
  codigoDaCampanha,
  faixaNoAr,
  lembrarDoCupom,
  lerCampanha,
  linkDaCampanha,
  mensagemDoCupomSemUso,
  relogio,
  tamanhosDaCampanha,
  tempoQueFalta,
  venceEm,
} from "./regras";
import { passosDeCompra } from "./como-comprar";

const HORA = 60 * 60 * 1000;
const agora = new Date("2026-11-10T12:00:00Z");

describe("campanha de lançamento", () => {
  it("monta o endereço a partir do nome", () => {
    expect(codigoDaCampanha("Lançamento RN!")).toBe("lancamento-rn");
    expect(codigoDaCampanha("  RN  ")).toBe("rn");
  });

  it("lê os tamanhos na ordem oficial, sem repetir", () => {
    expect(tamanhosDaCampanha("RN,Prematuro,rn,XG")).toEqual(["Prematuro", "RN"]);
    expect(tamanhosDaCampanha(["P", "RN"])).toEqual(["RN", "P"]);
  });

  it("lê o formulário do painel", () => {
    const lido = lerCampanha(
      { nome: " Lançamento  RN ", codigo: "", titulo: "", texto: " Peças selecionadas ", faixa: "Cadastre-se e ganhe 10%", ate: "2026-11-11T09:00", cupom: " bemvinda10 ", ativa: "on" },
      ["RN", "Prematuro"],
    );
    expect(lido).toEqual({
      ok: true,
      dados: {
        nome: "Lançamento RN",
        codigo: "lancamento-rn",
        titulo: "Lançamento RN",
        texto: "Peças selecionadas",
        tamanhos: ["Prematuro", "RN"],
        faixa: "Cadastre-se e ganhe 10%",
        ate: "2026-11-11T12:00:00.000Z",
        cupom: "BEMVINDA10",
        ativa: true,
      },
    });
    expect(lerCampanha({ nome: "RN" }, [])).toEqual({ ok: false, erro: "Marque pelo menos um tamanho para a página da campanha." });
    expect(lerCampanha({ nome: "R" }, ["RN"]).ok).toBe(false);
    expect(lerCampanha({ nome: "RN", ate: "amanhã" }, ["RN"])).toMatchObject({ ok: false, erro: expect.stringContaining("contagem") });
    expect(lerCampanha({ nome: "RN", cupom: "a b" }, ["RN"]).ok).toBe(false);
  });

  it("a faixa só aparece no ar, com frase e antes do fim da contagem", () => {
    const base = { ativa: true, faixa: "Ganhe 10%", ate: new Date(agora.getTime() + HORA) };
    expect(faixaNoAr(base, agora)).toBe(true);
    expect(faixaNoAr({ ...base, ate: null }, agora)).toBe(true);
    expect(faixaNoAr({ ...base, ativa: false }, agora)).toBe(false);
    expect(faixaNoAr({ ...base, faixa: null }, agora)).toBe(false);
    expect(faixaNoAr({ ...base, ate: new Date(agora.getTime() - 1) }, agora)).toBe(false);
  });

  it("conta o tempo que falta", () => {
    expect(tempoQueFalta(new Date(agora.getTime() + 26 * HORA), agora)).toBe("1 dia e 2 h");
    expect(tempoQueFalta(new Date(agora.getTime() + 5 * HORA + 12 * 60000), agora)).toBe("5 h e 12 min");
    expect(tempoQueFalta(new Date(agora.getTime() + 30000), agora)).toBe("menos de 1 min");
    expect(tempoQueFalta(agora, agora)).toBeNull();
    expect(relogio(new Date(agora.getTime() + 25 * HORA + 61000), agora)).toEqual({ dias: 1, horas: 1, minutos: 1, segundos: 1 });
    expect(relogio(new Date(0), agora)).toEqual({ dias: 0, horas: 0, minutos: 0, segundos: 0 });
  });

  it("o link leva a marca do grupo", () => {
    expect(linkDaCampanha("https://app.saltybaby.com.br/", "rn", "rn")).toBe("https://app.saltybaby.com.br/c/rn?g=rn");
    expect(linkDaCampanha("https://x.com", "rn")).toBe("https://x.com/c/rn");
  });
});

describe("lembrete do cupom de boas-vindas", () => {
  it("vence no prazo do cadastro ou no fim do cupom, o que vier antes", () => {
    const prazo = new Date("2026-11-15T12:00:00Z");
    expect(venceEm(prazo, "2026-11-30")).toEqual(prazo);
    expect(venceEm(prazo, "2026-11-12")).toEqual(new Date("2026-11-13T02:59:59Z"));
    expect(venceEm(null, null)).toBeNull();
  });

  it("lembra só nos últimos 3 dias", () => {
    expect(lembrarDoCupom(new Date(agora.getTime() + 2 * 24 * HORA), agora)).toBe(true);
    expect(lembrarDoCupom(new Date(agora.getTime() + 4 * 24 * HORA), agora)).toBe(false);
    expect(lembrarDoCupom(new Date(agora.getTime() - 1), agora)).toBe(false);
  });

  it("a mensagem traz o cupom, o prazo, o link e como sair", () => {
    const m = mensagemDoCupomSemUso({
      nomeCliente: "Maria Clara",
      nomeLoja: "Salty Baby",
      codigo: "BEMVINDA10",
      desconto: "10%",
      vence: new Date("2026-11-12T12:00:00Z"),
      link: "https://x.com/c/rn",
    });
    expect(m).toContain("Oi, Maria!");
    expect(m).toContain("vale até 12/11/2026 09:00");
    expect(m).toContain("*BEMVINDA10*");
    expect(m).toContain("https://x.com/c/rn");
    expect(m).toContain("responder SAIR");
  });
});

describe("como comprar", () => {
  it("usa a reserva, a sacolinha e o cupom da loja", () => {
    const passos = passosDeCompra({ minutosReserva: 15, mesesSacolinha: 3, cupom: "BEMVINDA10" });
    expect(passos).toHaveLength(6);
    expect(passos.map((p) => p.texto).join(" ")).toContain("15 minutos");
    expect(passos.map((p) => p.texto).join(" ")).toContain("BEMVINDA10");
    expect(passos.map((p) => p.texto).join(" ")).toContain("3 meses");
  });
});
