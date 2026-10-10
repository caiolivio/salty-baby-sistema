// PDF das etiquetas feito no servidor, já no tamanho de 50 × 30 mm por página.
// Não depende do navegador: Safari, iPhone e Android ignoram o tamanho de página
// do CSS e imprimiam em A4.

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

export const LARGURA_MM = 50;
export const ALTURA_MM = 30;
const MM = 72 / 25.4;

export type EtiquetaPdf = {
  endereco: string;
  nome: string;
  preco: string | null;
  codigo: string;
  tamanho: string | null;
};

/** Tira os caracteres que a fonte padrão do PDF não tem (emoji, por exemplo). */
export function textoQueCabeNaFonte(texto: string, cabe: (caractere: string) => boolean): string {
  return [...texto.normalize("NFC")].filter((c) => cabe(c)).join("").replace(/\s+/g, " ").trim();
}

/** Quebra em até `linhas` linhas da largura dada; o que sobra vira "…". */
export function quebrarTexto(texto: string, largura: number, medir: (t: string) => number, linhas: number): string[] {
  const palavras = texto.split(" ").filter(Boolean);
  const resultado: string[] = [];
  let atual = "";
  for (let i = 0; i < palavras.length; i++) {
    const tentativa = atual ? `${atual} ${palavras[i]}` : palavras[i];
    if (medir(tentativa) <= largura) {
      atual = tentativa;
      continue;
    }
    if (atual) resultado.push(atual);
    atual = palavras[i];
    if (resultado.length === linhas) {
      atual = "";
      resultado[linhas - 1] = reticencias(`${resultado[linhas - 1]} ${palavras.slice(i).join(" ")}`, largura, medir);
      return resultado;
    }
  }
  if (atual) resultado.push(atual);
  return resultado.map((l) => (medir(l) > largura ? reticencias(l, largura, medir) : l));
}

function reticencias(texto: string, largura: number, medir: (t: string) => number): string {
  if (medir(texto) <= largura) return texto;
  let t = texto;
  while (t.length > 0 && medir(`${t}…`) > largura) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function desenharQr(pagina: PDFPage, endereco: string, x: number, y: number, lado: number) {
  const { size, data } = QRCode.create(endereco, { errorCorrectionLevel: "M" }).modules;
  const modulo = lado / size;
  for (let linha = 0; linha < size; linha++) {
    let inicio = -1;
    for (let coluna = 0; coluna <= size; coluna++) {
      const escuro = coluna < size && data[linha * size + coluna];
      if (escuro && inicio < 0) inicio = coluna;
      if (!escuro && inicio >= 0) {
        // Cada faixa invade um pouco a de baixo: sem isso aparecem linhas brancas finas na tela.
        const sobra = linha < size - 1 ? modulo * 0.12 : 0;
        pagina.drawRectangle({
          x: x + inicio * modulo,
          y: y + lado - (linha + 1) * modulo - sobra,
          width: (coluna - inicio) * modulo,
          height: modulo + sobra,
          color: rgb(0, 0, 0),
        });
        inicio = -1;
      }
    }
  }
}

type Linha = { texto: string; fonte: PDFFont; tamanho: number };

/** Uma etiqueta por página de 50 × 30 mm: QR à esquerda; logo, nome, preço, código e tamanho à direita. */
export async function pdfDasEtiquetas(etiquetas: EtiquetaPdf[], logoPng: Uint8Array | null, titulo = "Etiquetas"): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo: PDFImage | null = logoPng ? await pdf.embedPng(logoPng) : null;
  const cabe = (c: string) => {
    try {
      negrito.encodeText(c);
      return true;
    } catch {
      return false;
    }
  };

  const largura = LARGURA_MM * MM;
  const altura = ALTURA_MM * MM;
  const margem = 2 * MM;
  const ladoQr = 22 * MM;
  const xTexto = margem + ladoQr + 2 * MM;
  const larguraTexto = largura - xTexto - margem;

  for (const e of etiquetas) {
    const pagina = pdf.addPage([largura, altura]);
    desenharQr(pagina, e.endereco, margem, (altura - ladoQr) / 2, ladoQr);

    const linhas: Linha[] = [];
    const nome = textoQueCabeNaFonte(e.nome, cabe);
    for (const l of quebrarTexto(nome, larguraTexto, (t) => negrito.widthOfTextAtSize(t, 7), 2)) linhas.push({ texto: l, fonte: negrito, tamanho: 7 });
    if (e.preco) {
      const preco = textoQueCabeNaFonte(e.preco, cabe);
      let tamanho = 11;
      while (tamanho > 7 && negrito.widthOfTextAtSize(preco, tamanho) > larguraTexto) tamanho -= 0.5;
      linhas.push({ texto: preco, fonte: negrito, tamanho });
    }
    linhas.push({ texto: textoQueCabeNaFonte(e.codigo, cabe), fonte: normal, tamanho: 6 });
    if (e.tamanho) {
      const tam = reticencias(textoQueCabeNaFonte(`Tam. ${e.tamanho}`, cabe), larguraTexto, (t) => negrito.widthOfTextAtSize(t, 6.5));
      linhas.push({ texto: tam, fonte: negrito, tamanho: 6.5 });
    }

    const larguraLogo = Math.min(19 * MM, larguraTexto);
    const alturaLogo = logo ? Math.min((larguraLogo * logo.height) / logo.width, 8 * MM) : 0;
    const espacoLogo = logo ? alturaLogo + 0.6 * MM : 0;
    const alturaLinha = (l: Linha) => l.tamanho * 1.15;
    const total = espacoLogo + linhas.reduce((s, l) => s + alturaLinha(l), 0);
    let topo = (altura + total) / 2;

    if (logo) {
      const w = (alturaLogo * logo.width) / logo.height;
      pagina.drawImage(logo, { x: xTexto, y: topo - alturaLogo, width: w, height: alturaLogo });
      topo -= espacoLogo;
    }
    for (const l of linhas) {
      const h = alturaLinha(l);
      pagina.drawText(l.texto, { x: xTexto, y: topo - h + (h - l.tamanho) / 2 + l.tamanho * 0.2, size: l.tamanho, font: l.fonte, color: rgb(0, 0, 0) });
      topo -= h;
    }
  }
  return pdf.save();
}
