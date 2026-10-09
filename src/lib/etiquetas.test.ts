import { describe, expect, it } from "vitest";
import { enderecoDaEtiqueta, lerFormato, lerIds, origemDaRequisicao } from "./etiquetas";

const cabecalhos = (valores: Record<string, string>) => ({ get: (n: string) => valores[n] ?? null });

describe("etiquetas", () => {
  it("monta o endereço curto do QR com o código da peça", () => {
    expect(enderecoDaEtiqueta("https://teste.saltybaby.com.br/", "F48-00001")).toBe("https://teste.saltybaby.com.br/e/f48-00001");
    expect(enderecoDaEtiqueta("https://app.saltybaby.com.br", "SB-00012")).toBe("https://app.saltybaby.com.br/e/sb-00012");
  });

  it("lê a lista de peças escolhidas", () => {
    expect(lerIds("a,b, a,,c")).toEqual(["a", "b", "c"]);
    expect(lerIds(["a", "b,c"])).toEqual(["a", "b", "c"]);
    expect(lerIds(undefined)).toEqual([]);
  });

  it("usa folha A4 quando o formato não é o rolo", () => {
    expect(lerFormato("rolo")).toBe("rolo");
    expect(lerFormato("a4")).toBe("a4");
    expect(lerFormato("x")).toBe("rolo");
    expect(lerFormato(undefined)).toBe("rolo");
  });

  it("descobre o endereço do site pelos cabeçalhos", () => {
    expect(origemDaRequisicao(cabecalhos({ host: "teste.saltybaby.com.br", "x-forwarded-proto": "https" }))).toBe("https://teste.saltybaby.com.br");
    expect(origemDaRequisicao(cabecalhos({ host: "teste.saltybaby.com.br" }))).toBe("https://teste.saltybaby.com.br");
    expect(origemDaRequisicao(cabecalhos({ host: "127.0.0.1:4199" }))).toBe("http://127.0.0.1:4199");
  });
});
