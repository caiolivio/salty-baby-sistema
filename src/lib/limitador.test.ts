import { describe, expect, it } from "vitest";
import { BLOQUEIO_MS, criarLimitador, MAXIMO_TENTATIVAS } from "./limitador";

describe("limitador de tentativas de senha", () => {
  it(`bloqueia depois de ${MAXIMO_TENTATIVAS} erros e libera depois de 15 minutos`, () => {
    let agora = 0;
    const limitador = criarLimitador(() => agora);
    for (let i = 1; i < MAXIMO_TENTATIVAS; i++) limitador.registrarFalha("ana@x.com");
    expect(limitador.esperaRestante("ana@x.com")).toBe(0);

    limitador.registrarFalha("ana@x.com");
    expect(limitador.esperaRestante("ana@x.com")).toBe(BLOQUEIO_MS);
    expect(limitador.esperaRestante("outra@x.com")).toBe(0);

    agora = BLOQUEIO_MS;
    expect(limitador.esperaRestante("ana@x.com")).toBe(0);
  });

  it("um acerto zera os erros", () => {
    const limitador = criarLimitador(() => 0);
    for (let i = 1; i < MAXIMO_TENTATIVAS; i++) limitador.registrarFalha("ana@x.com");
    limitador.registrarSucesso("ana@x.com");
    limitador.registrarFalha("ana@x.com");
    expect(limitador.esperaRestante("ana@x.com")).toBe(0);
  });
});
