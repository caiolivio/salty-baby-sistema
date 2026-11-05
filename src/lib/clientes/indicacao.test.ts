import { describe, expect, it } from "vitest";
import { gerarCodigoDeIndicacao, lerCodigoDeIndicacao, linkDeIndicacao, mensagemDoMimo, mensagemParaIndicar, MIMO_PADRAO } from "./indicacao";

describe("indique uma amiga", () => {
  it("gera códigos curtos, sem letras que se confundem", () => {
    const codigo = gerarCodigoDeIndicacao();
    expect(codigo).toMatch(/^[a-z2-9]{7}$/);
    expect(codigo).not.toMatch(/[01ilo]/);
    expect(lerCodigoDeIndicacao(codigo)).toBe(codigo);
  });

  it("lê o código do endereço e recusa o que não parece código", () => {
    expect(lerCodigoDeIndicacao(" AbC23xy ")).toBe("abc23xy");
    expect(lerCodigoDeIndicacao("x")).toBeNull();
    expect(lerCodigoDeIndicacao("<script>")).toBeNull();
    expect(lerCodigoDeIndicacao(undefined)).toBeNull();
  });

  it("monta o link e as mensagens", () => {
    const link = linkDeIndicacao("https://x.com/", "abc23xy");
    expect(link).toBe("https://x.com/cadastro?indicacao=abc23xy");
    expect(mensagemParaIndicar({ nomeLoja: "Salty Baby", link, cupom: "BEMVINDA10" })).toContain("*BEMVINDA10*");
    expect(mensagemParaIndicar({ nomeLoja: "Salty Baby", link })).not.toContain("cupom");
    const mimo = mensagemDoMimo({ nomeCliente: "Ana Paula", nomeAmiga: "Bia Souza", nomeLoja: "Salty Baby", mimo: null });
    expect(mimo).toContain("Oi, Ana!");
    expect(mimo).toContain("A Bia se cadastrou");
    expect(mimo).toContain(MIMO_PADRAO);
    expect(mensagemDoMimo({ nomeCliente: "Ana", nomeAmiga: "Bia", nomeLoja: "S", mimo: "um laço" })).toContain("um laço");
  });
});
