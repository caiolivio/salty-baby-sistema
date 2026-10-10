import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { ALTURA_MM, LARGURA_MM, pdfDasEtiquetas, quebrarTexto, textoQueCabeNaFonte } from "./etiquetas-pdf";

const medir = (t: string) => t.length;

describe("PDF das etiquetas", () => {
  it("tem uma página de 50 × 30 mm por etiqueta", async () => {
    const etiqueta = { endereco: "https://teste/e/f48-00001", nome: "Vestido de festa com laço 🎀", preco: "R$ 49,90", codigo: "F48-00001", tamanho: "10 anos" };
    const bytes = await pdfDasEtiquetas([etiqueta, { ...etiqueta, preco: null, tamanho: null }], null);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    for (const pagina of pdf.getPages()) {
      expect((pagina.getWidth() * 25.4) / 72).toBeCloseTo(LARGURA_MM, 3);
      expect((pagina.getHeight() * 25.4) / 72).toBeCloseTo(ALTURA_MM, 3);
    }
  });

  it("quebra o nome em até duas linhas, com reticências", () => {
    expect(quebrarTexto("Body manga longa", 10, medir, 2)).toEqual(["Body manga", "longa"]);
    const [, segunda] = quebrarTexto("Conjunto moletom azul marinho com capuz", 12, medir, 2);
    expect(segunda.endsWith("…")).toBe(true);
    expect(segunda.length).toBeLessThanOrEqual(12);
  });

  it("tira o que a fonte não tem", () => {
    expect(textoQueCabeNaFonte("Laço  🎀 rosa", (c) => c !== "🎀")).toBe("Laço rosa");
  });
});
