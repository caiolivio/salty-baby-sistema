// Exportação das tabelas do painel para Excel (.xlsx) e CSV. Funções puras,
// testadas. O .xlsx é montado à mão (é um .zip de arquivos XML), sem biblioteca
// extra: só o fflate, que o sistema já usa para ler o export do Notion.

import { strToU8, zipSync } from "fflate";

export type TipoColuna = "texto" | "numero" | "reais" | "data" | "datahora";
export type Valor = string | number | Date | boolean | null | undefined;

export type Coluna<T> = {
  titulo: string;
  tipo?: TipoColuna;
  valor: (linha: T) => Valor;
};

const FUSO = "America/Sao_Paulo";

/** "Sim"/"Não" para verdadeiro e falso; vazio para nada. */
function comoTexto(v: Valor): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** Partes da data no fuso de São Paulo (data e hora) ou em UTC (só data, como a de entrada da peça). */
function partes(d: Date, comHora: boolean) {
  if (!comHora) {
    return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate(), hora: 0, minuto: 0 };
  }
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { ano: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour, minuto: +p.minute };
}

const dois = (n: number) => String(n).padStart(2, "0");

/** Valor de uma célula no CSV: no formato que o Excel em português entende. */
export function celulaCsv(v: Valor, tipo: TipoColuna = "texto"): string {
  if (v === null || v === undefined || v === "") return "";
  let texto: string;
  if (v instanceof Date && (tipo === "data" || tipo === "datahora")) {
    const p = partes(v, tipo === "datahora");
    texto = `${dois(p.dia)}/${dois(p.mes)}/${p.ano}${tipo === "datahora" ? ` ${dois(p.hora)}:${dois(p.minuto)}` : ""}`;
  } else if (typeof v === "number" && tipo === "reais") {
    // Centavos → "1234,56" (sem separador de milhar, para o Excel ler como número).
    const sinal = v < 0 ? "-" : "";
    const abs = Math.abs(v);
    texto = `${sinal}${Math.floor(abs / 100)},${dois(abs % 100)}`;
  } else if (typeof v === "number") {
    texto = String(v).replace(".", ",");
  } else {
    texto = comoTexto(v);
  }
  // Evita que o Excel trate texto como fórmula (=, +, -, @).
  if (tipo === "texto" && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV separado por ponto e vírgula, com BOM, como o Excel brasileiro abre direto. */
export function gerarCsv<T>(colunas: Coluna<T>[], linhas: T[]): string {
  const cabecalho = colunas.map((c) => celulaCsv(c.titulo)).join(";");
  const corpo = linhas.map((l) => colunas.map((c) => celulaCsv(c.valor(l), c.tipo)).join(";"));
  return "﻿" + [cabecalho, ...corpo].join("\r\n") + "\r\n";
}

const xml = (t: string) =>
  t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Caracteres de controle não são aceitos no XML.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function letraDaColuna(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Data como número de série do Excel (dias desde 30/12/1899). */
function serialExcel(d: Date, comHora: boolean): number {
  const p = partes(d, comHora);
  const dias = (Date.UTC(p.ano, p.mes - 1, p.dia) - Date.UTC(1899, 11, 30)) / 86_400_000;
  return dias + (p.hora * 60 + p.minuto) / 1440;
}

// Estilos: 0 normal, 1 cabeçalho em negrito, 2 R$, 3 data, 4 data e hora.
const ESTILO: Record<TipoColuna, number> = { texto: 0, numero: 0, reais: 2, data: 3, datahora: 4 };

function celulaXlsx(ref: string, v: Valor, tipo: TipoColuna): string {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date && (tipo === "data" || tipo === "datahora")) {
    return `<c r="${ref}" s="${ESTILO[tipo]}"><v>${serialExcel(v, tipo === "datahora")}</v></c>`;
  }
  if (typeof v === "number" && Number.isFinite(v) && tipo !== "texto") {
    const numero = tipo === "reais" ? v / 100 : v;
    return `<c r="${ref}" s="${ESTILO[tipo]}"><v>${numero}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(comoTexto(v))}</t></is></c>`;
}

/** Planilha do Excel (.xlsx) com uma aba, cabeçalho em negrito e fixo, e filtro. */
export function gerarXlsx<T>(colunas: Coluna<T>[], linhas: T[], nomeDaAba = "Dados"): Uint8Array {
  const ultima = letraDaColuna(Math.max(0, colunas.length - 1));
  const cabecalho = `<row r="1">${colunas
    .map((c, i) => `<c r="${letraDaColuna(i)}1" t="inlineStr" s="1"><is><t>${xml(c.titulo)}</t></is></c>`)
    .join("")}</row>`;
  const corpo = linhas
    .map((l, n) => {
      const r = n + 2;
      return `<row r="${r}">${colunas.map((c, i) => celulaXlsx(`${letraDaColuna(i)}${r}`, c.valor(l), c.tipo ?? "texto")).join("")}</row>`;
    })
    .join("");
  const larguras = colunas
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(40, Math.max(10, c.titulo.length + 4))}" customWidth="1"/>`)
    .join("");
  const aba = xml(nomeDaAba.slice(0, 31).replace(/[\\/?*[\]:]/g, " "));

  const arquivos: Record<string, string> = {
    "[Content_Types].xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    "_rels/.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${aba}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${aba.replace(/'/g, "''")}'!$A$1:$${ultima}$${linhas.length + 1}</definedName></definedNames></workbook>`,
    "xl/_rels/workbook.xml.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy\\ hh:mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="5"><xf/><xf fontId="1" applyFont="1"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="165" applyNumberFormat="1"/><xf numFmtId="166" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${larguras}</cols><sheetData>${cabecalho}${corpo}</sheetData><autoFilter ref="A1:${ultima}${linhas.length + 1}"/></worksheet>`,
  };
  return zipSync(Object.fromEntries(Object.entries(arquivos).map(([nome, conteudo]) => [nome, strToU8(conteudo)])), {
    level: 6,
  });
}

/** Nome do arquivo: "pecas-2026-10-01.xlsx". */
export function nomeDoArquivo(base: string, hoje: string, formato: "xlsx" | "csv"): string {
  return `${base}-${hoje}.${formato}`;
}
