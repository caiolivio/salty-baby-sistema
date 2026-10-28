import { describe, expect, it } from "vitest";
import {
  contraste,
  cssDasCores,
  LOJA_PADRAO,
  lerFormularioLoja,
  linkDaPaginaDoVideo,
  nomeComSlogan,
  videoParaIncorporar,
  whatsappNaTela,
} from "./regras";

const formulario = {
  nome: "Salty Baby",
  nomeCurto: "Salty",
  slogan: "Moda Sustentável",
  descricao: "Brechó infantil em Caraguatatuba-SP",
  whatsapp: "(12) 98105-3623",
  instagram: "",
  corDestaque: "#32afb5",
  corPrincipal: "#13506e",
  corTexto: "#13212b",
  prefixoLoja: "sb",
  repassePadrao: "40",
  minutosReserva: "15",
  mesesDevolucao: "6",
  mesesSacolinha: "3",
};

describe("lerFormularioLoja", () => {
  it("lê e normaliza: WhatsApp com 55, cores em maiúsculas, prefixo e repasse", () => {
    const r = lerFormularioLoja(formulario);
    expect(r).toEqual({
      ok: true,
      dados: {
        ...formulario,
        whatsapp: "5512981053623",
        instagram: null,
        corDestaque: "#32AFB5",
        corPrincipal: "#13506E",
        corTexto: "#13212B",
        prefixoLoja: "SB",
        repassePadrao: 4000,
        minutosReserva: 15,
        mesesDevolucao: 6,
        mesesSacolinha: 3,
        videoInstalarApp: null,
      },
    });
  });

  it("aceita o Instagram como @perfil ou link", () => {
    for (const instagram of ["@saltybaby", "saltybaby", "https://www.instagram.com/saltybaby/"]) {
      const r = lerFormularioLoja({ ...formulario, instagram });
      expect(r.ok && r.dados.instagram).toBe("saltybaby");
    }
    expect(lerFormularioLoja({ ...formulario, instagram: "nome com espaço" }).ok).toBe(false);
  });

  it("recusa WhatsApp sem DDD, prefixo com número e regras fora da faixa", () => {
    expect(lerFormularioLoja({ ...formulario, whatsapp: "98105-3623" })).toMatchObject({ ok: false, erro: /DDD/ });
    expect(lerFormularioLoja({ ...formulario, prefixoLoja: "F1" })).toMatchObject({ ok: false, erro: /prefixo/ });
    expect(lerFormularioLoja({ ...formulario, prefixoLoja: "S" }).ok).toBe(false);
    expect(lerFormularioLoja({ ...formulario, repassePadrao: "120" }).ok).toBe(false);
    expect(lerFormularioLoja({ ...formulario, minutosReserva: "2" }).ok).toBe(false);
    expect(lerFormularioLoja({ ...formulario, mesesDevolucao: "-1" }).ok).toBe(false);
    expect(lerFormularioLoja({ ...formulario, nome: "" }).ok).toBe(false);
  });

  it("recusa cor principal ou de texto clara demais para ler no branco", () => {
    expect(lerFormularioLoja({ ...formulario, corPrincipal: "#32AFB5" })).toMatchObject({ ok: false, erro: /principal/ });
    expect(lerFormularioLoja({ ...formulario, corTexto: "#cccccc" })).toMatchObject({ ok: false, erro: /texto/ });
    // O destaque pode ser claro: é só para ícones.
    expect(lerFormularioLoja({ ...formulario, corDestaque: "#ffe000" }).ok).toBe(true);
  });

  it("com peças da loja já cadastradas, o prefixo fica o mesmo", () => {
    const r = lerFormularioLoja({ ...formulario, prefixoLoja: "XY" }, "SB");
    expect(r.ok && r.dados.prefixoLoja).toBe("SB");
  });
});

describe("cores e textos", () => {
  it("calcula o contraste como o WCAG", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contraste("#13506E", "#FFFFFF")).toBeGreaterThan(4.5);
    expect(contraste("#32AFB5", "#FFFFFF")).toBeLessThan(4.5);
  });

  it("monta as variáveis de cor só com cores válidas", () => {
    expect(cssDasCores(LOJA_PADRAO)).toBe(":root{--turquesa:#32AFB5;--petroleo:#13506E;--tinta:#13212B}");
    expect(cssDasCores({ ...LOJA_PADRAO, corTexto: "red;}body{display:none" })).toBe("");
  });

  it("mostra o WhatsApp e o nome com slogan", () => {
    expect(whatsappNaTela("5512981053623")).toBe("(12) 98105-3623");
    expect(nomeComSlogan(LOJA_PADRAO)).toBe("Salty Baby · Moda Sustentável");
    expect(nomeComSlogan({ nome: "Loja X", slogan: null })).toBe("Loja X");
  });
});

describe("vídeo de como instalar o app", () => {
  it("aceita só link https", () => {
    const ok = lerFormularioLoja({ ...formulario, videoInstalarApp: " https://youtu.be/abc123XYZ " });
    expect(ok.ok && ok.dados.videoInstalarApp).toBe("https://youtu.be/abc123XYZ");
    expect(lerFormularioLoja({ ...formulario, videoInstalarApp: "youtu.be/abc" }).ok).toBe(false);
    expect(lerFormularioLoja({ ...formulario, videoInstalarApp: "http://exemplo.com/v.mp4" }).ok).toBe(false);
  });

  it("mostra dentro da página os vídeos do YouTube e do Google Drive", () => {
    expect(videoParaIncorporar("https://youtu.be/abc123XYZ")).toBe("https://www.youtube-nocookie.com/embed/abc123XYZ?rel=0");
    expect(videoParaIncorporar("https://www.youtube.com/watch?v=abc123XYZ&t=3")).toBe("https://www.youtube-nocookie.com/embed/abc123XYZ?rel=0");
    expect(videoParaIncorporar("https://youtube.com/shorts/abc123XYZ")).toBe("https://www.youtube-nocookie.com/embed/abc123XYZ?rel=0");
    expect(videoParaIncorporar("https://drive.google.com/file/d/1k4PwJL9zMnuyLN-QHyOhxMushUwIQ30R/view?usp=drive_link")).toBe(
      "https://drive.google.com/file/d/1k4PwJL9zMnuyLN-QHyOhxMushUwIQ30R/preview",
    );
    expect(videoParaIncorporar("https://exemplo.com/video.mp4")).toBeNull();
    expect(videoParaIncorporar(null)).toBeNull();
  });
});

describe("link da página do vídeo", () => {
  it("só vai nas mensagens quando a loja tem vídeo", () => {
    expect(linkDaPaginaDoVideo("https://x.com/", { videoInstalarApp: "https://youtu.be/a" })).toBe("https://x.com/instalar-app");
    expect(linkDaPaginaDoVideo("https://x.com", { videoInstalarApp: null })).toBeUndefined();
  });
});
