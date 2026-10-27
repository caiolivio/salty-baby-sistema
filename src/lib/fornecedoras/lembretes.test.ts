import { describe, expect, it } from "vitest";
import { mensagemDeLembrete, precisaDeLembrete, situacaoDoConvite, textoDaSituacao } from "./lembretes";

const agora = new Date("2026-10-27T15:00:00Z");
const diasAtras = (n: number) => new Date(agora.getTime() - n * 24 * 60 * 60 * 1000);
const convite = (dias: number) => ({ criadoEm: diasAtras(dias), expiraEm: new Date(diasAtras(dias).getTime() + 7 * 24 * 60 * 60 * 1000) });
const semConta = { temConta: false, etapa: "dados" as const };

describe("situação do convite", () => {
  it("sem conta: sem link, aguardando ou vencido", () => {
    expect(situacaoDoConvite(semConta, null, agora).tipo).toBe("sem-link");
    expect(situacaoDoConvite(semConta, convite(2), agora).tipo).toBe("aguardando");
    expect(situacaoDoConvite(semConta, convite(8), agora).tipo).toBe("vencido");
  });

  it("com conta: começou ou concluiu", () => {
    expect(situacaoDoConvite({ temConta: true, etapa: "acordo" }, null, agora)).toEqual({ tipo: "comecou", etapa: "acordo" });
    expect(situacaoDoConvite({ temConta: true, etapa: "parabens" }, null, agora).tipo).toBe("concluido");
    expect(situacaoDoConvite({ temConta: true, etapa: "liberada" }, convite(10), agora).tipo).toBe("concluido");
  });

  it("frase da situação", () => {
    expect(textoDaSituacao(situacaoDoConvite(semConta, convite(8), agora))).toContain("venceu");
    expect(textoDaSituacao({ tipo: "comecou", etapa: "dados" })).toContain("não terminou o cadastro");
  });
});

describe("quem precisa de lembrete", () => {
  it("link de 3 dias ou mais sem uso, ou cadastro parado no meio", () => {
    expect(precisaDeLembrete(situacaoDoConvite(semConta, convite(2), agora), agora)).toBe(false);
    expect(precisaDeLembrete(situacaoDoConvite(semConta, convite(3), agora), agora)).toBe(true);
    expect(precisaDeLembrete(situacaoDoConvite(semConta, convite(9), agora), agora)).toBe(true);
    expect(precisaDeLembrete({ tipo: "comecou", etapa: "acordo" }, agora)).toBe(true);
    expect(precisaDeLembrete({ tipo: "sem-link" }, agora)).toBe(false);
    expect(precisaDeLembrete({ tipo: "concluido" }, agora)).toBe(false);
  });
});

describe("mensagem de lembrete", () => {
  it("leva o link novo e, se houver, o vídeo", () => {
    const m = mensagemDeLembrete("Ana Souza", situacaoDoConvite(semConta, convite(4), agora), "https://x/convite/abc", "Salty Baby", "https://x/instalar-app");
    expect(m.startsWith("Oi, Ana!")).toBe(true);
    expect(m).toContain("https://x/convite/abc");
    expect(m).toContain("https://x/instalar-app");
  });

  it("quem parou no meio recebe o endereço de entrar e o que falta", () => {
    const m = mensagemDeLembrete("Ana", { tipo: "comecou", etapa: "acordo" }, "https://x/entrar");
    expect(m).toContain("aceitar o acordo");
    expect(m).toContain("https://x/entrar");
    expect(m).not.toContain("tela inicial");
  });
});
