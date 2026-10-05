import { describe, expect, it } from "vitest";
import { formatarReais } from "../dinheiro";
import {
  blocosDoTexto,
  lerFormularioPagina,
  linkSeguro,
  porcentoPorExtenso,
  preencher,
  TEXTOS_INICIAIS,
  trechosDaLinha,
  versaoDoAcordo,
} from "./regras";

const loja = { nome: "Salty Baby", nomeCurto: "Salty", whatsapp: "5512981053623", repassePadrao: 4000, mesesDevolucao: 6, mesesSacolinha: 3 };

describe("variáveis", () => {
  it("troca pelos dados da loja e deixa as desconhecidas", () => {
    expect(preencher("{loja} paga {repasse} e devolve em {meses_devolucao} meses. {outra}", loja)).toBe(
      "Salty Baby paga 40% e devolve em 6 meses. {outra}",
    );
    expect(preencher("WhatsApp {whatsapp}", loja)).toBe("WhatsApp (12) 98105-3623");
    expect(preencher("{repasse}", { ...loja, repassePadrao: 4250 })).toBe("42,5%");
  });

  it("os textos iniciais não deixam variável sem trocar", () => {
    for (const t of Object.values(TEXTOS_INICIAIS)) {
      expect(preencher(t.titulo + t.conteudo, loja)).not.toMatch(/\{[a-z_]+\}/);
    }
  });
});

describe("formato do texto", () => {
  it("lê títulos, parágrafos e listas", () => {
    expect(blocosDoTexto("## Título\nlinha 1\nlinha 2\n\n- a\n- b\n### Sub\nfim")).toEqual([
      { tipo: "titulo", nivel: 2, trechos: [{ tipo: "texto", texto: "Título" }] },
      { tipo: "paragrafo", linhas: [[{ tipo: "texto", texto: "linha 1" }], [{ tipo: "texto", texto: "linha 2" }]] },
      { tipo: "lista", itens: [[{ tipo: "texto", texto: "a" }], [{ tipo: "texto", texto: "b" }]] },
      { tipo: "titulo", nivel: 3, trechos: [{ tipo: "texto", texto: "Sub" }] },
      { tipo: "paragrafo", linhas: [[{ tipo: "texto", texto: "fim" }]] },
    ]);
  });

  it("lê negrito e links", () => {
    expect(trechosDaLinha("Leia **com atenção** o [aviso](/privacidade).")).toEqual([
      { tipo: "texto", texto: "Leia " },
      { tipo: "negrito", texto: "com atenção" },
      { tipo: "texto", texto: " o " },
      { tipo: "link", texto: "aviso", href: "/privacidade" },
      { tipo: "texto", texto: "." },
    ]);
  });

  it("não aceita links perigosos (vira texto)", () => {
    expect(trechosDaLinha("[clique](javascript:alert(1))")[0]).toEqual({ tipo: "texto", texto: "clique" });
    expect(linkSeguro("//outro.site")).toBeNull();
    expect(linkSeguro("people9.com.br")).toBe("https://people9.com.br");
    expect(linkSeguro("mailto:a@b.com")).toBe("mailto:a@b.com");
  });

  it("HTML fica como texto, nunca vira código", () => {
    expect(blocosDoTexto("<script>x</script>")).toEqual([
      { tipo: "paragrafo", linhas: [[{ tipo: "texto", texto: "<script>x</script>" }]] },
    ]);
  });
});

describe("formulário", () => {
  it("confere título e texto", () => {
    expect(lerFormularioPagina({ titulo: "", conteudo: "x".repeat(30) }, "termos").ok).toBe(false);
    expect(lerFormularioPagina({ titulo: "Termos", conteudo: "curto" }, "termos").ok).toBe(false);
  });

  it("o acordo e a privacidade ficam sempre no ar; só o acordo pede novo aceite", () => {
    const base = { titulo: "Título", conteudo: "x".repeat(30) };
    expect(lerFormularioPagina({ ...base, exigirAceite: "sim" }, "contrato")).toMatchObject({
      ok: true,
      dados: { publicada: true, exigirAceite: true },
    });
    expect(lerFormularioPagina({ ...base, exigirAceite: "sim" }, "termos")).toMatchObject({
      ok: true,
      dados: { publicada: false, exigirAceite: false },
    });
    expect(lerFormularioPagina({ ...base, publicada: "sim" }, "sobre")).toMatchObject({ ok: true, dados: { publicada: true } });
    expect(lerFormularioPagina(base, "privacidade")).toMatchObject({ ok: true, dados: { publicada: true } });
    expect(lerFormularioPagina(base, "resumo")).toMatchObject({ ok: true, dados: { publicada: true, exigirAceite: false } });
  });

  it("a versão do acordo aceito leva o número da versão salva", () => {
    expect(versaoDoAcordo(null)).toBe("2026-10-v2");
    expect(versaoDoAcordo(3)).toBe("v3");
  });
});

describe("contrato final", () => {
  const loja = {
    nome: "Salty Baby",
    nomeCurto: "Salty",
    whatsapp: "5512981053623",
    repassePadrao: 4000,
    mesesDevolucao: 6,
    mesesSacolinha: 3,
  };

  it("percentual por extenso", () => {
    expect(porcentoPorExtenso(4000)).toBe("quarenta por cento");
    expect(porcentoPorExtenso(6000)).toBe("sessenta por cento");
    expect(porcentoPorExtenso(3500)).toBe("trinta e cinco por cento");
    expect(porcentoPorExtenso(1500)).toBe("quinze por cento");
    expect(porcentoPorExtenso(10000)).toBe("cem por cento");
    expect(porcentoPorExtenso(3750)).toBe("37,5%");
  });

  it("divisão, exemplo e nome da loja vêm de Configurações", () => {
    const texto = preencher(TEXTOS_INICIAIS.contrato.conteudo, loja);
    expect(texto).toContain("- 40% (quarenta por cento) para a CONSIGNANTE;");
    expect(texto).toContain("- 60% (sessenta por cento) para a SALTY BABY.");
    expect(texto).toContain(`resultará em ${formatarReais(3200)} para a CONSIGNANTE e ${formatarReais(4800)} para a Salty Baby.`);
    expect(preencher(TEXTOS_INICIAIS.contrato.titulo, loja)).toBe("🐳 CONTRATO DE CONSIGNAÇÃO – SALTY BABY");
    expect(texto).not.toMatch(/\{[a-z_]+\}/);
    const titulos = blocosDoTexto(texto).filter((b) => b.tipo === "titulo");
    expect(titulos).toHaveLength(25);
  });
});
