import { describe, expect, it } from "vitest";
import { aparelhoPeloNavegador, iconeDoApp, manifestoDaLoja, ocupacaoDoIcone } from "./regras";

describe("app instalável", () => {
  const loja = { nome: "Salty Baby", nomeCurto: "Salty", descricao: "Brechó infantil", corPrincipal: "#13506E", versao: 3 };

  it("manifesto com o nome, a cor e os ícones da loja", () => {
    const m = manifestoDaLoja(loja);
    expect(m).toMatchObject({ name: "Salty Baby", short_name: "Salty", theme_color: "#13506E", display: "standalone", lang: "pt-BR" });
    expect(m.icons.map((i) => i.src)).toEqual(["/loja/app-192.png?v=3", "/loja/app-512.png?v=3", "/loja/app-recortavel.png?v=3"]);
    expect(m.icons[2].purpose).toBe("maskable");
  });

  it("nome curto cabe embaixo do ícone", () => {
    expect(manifestoDaLoja({ ...loja, nomeCurto: "Um nome curto comprido" }).short_name).toHaveLength(12);
  });

  it("ícones conhecidos", () => {
    expect(iconeDoApp("app-192.png")?.lado).toBe(192);
    expect(iconeDoApp("app-999.png")).toBeUndefined();
    expect(ocupacaoDoIcone(true)).toBe(0.8);
  });

  it("reconhece o aparelho", () => {
    expect(aparelhoPeloNavegador("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("iphone");
    expect(aparelhoPeloNavegador("Mozilla/5.0 (Linux; Android 14; SM-A145M)")).toBe("android");
    expect(aparelhoPeloNavegador("Mozilla/5.0 (Windows NT 10.0)")).toBe("outro");
  });
});
