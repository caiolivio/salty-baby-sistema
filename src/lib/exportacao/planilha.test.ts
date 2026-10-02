import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { celulaCsv, gerarCsv, gerarXlsx, type Coluna } from "./planilha";

type Linha = { codigo: string; preco: number; entrada: Date; vendidaEm: Date | null; ativa: boolean };
const colunas: Coluna<Linha>[] = [
  { titulo: "Código", valor: (l) => l.codigo },
  { titulo: "Preço", tipo: "reais", valor: (l) => l.preco },
  { titulo: "Entrada", tipo: "data", valor: (l) => l.entrada },
  { titulo: "Vendida em", tipo: "datahora", valor: (l) => l.vendidaEm },
  { titulo: "Ativa", valor: (l) => l.ativa },
];
const linhas: Linha[] = [
  { codigo: "F48-00001", preco: 123456, entrada: new Date("2026-10-01T00:00:00Z"), vendidaEm: new Date("2026-10-01T02:30:00Z"), ativa: true },
  { codigo: 'Vestido "rosa"; P', preco: 5, entrada: new Date("2026-01-31T00:00:00Z"), vendidaEm: null, ativa: false },
];

describe("CSV", () => {
  it("usa ponto e vírgula, vírgula nos centavos e datas brasileiras", () => {
    const csv = gerarCsv(colunas, linhas);
    expect(csv.startsWith("﻿Código;Preço;Entrada;Vendida em;Ativa\r\n")).toBe(true);
    // 02:30 UTC é 23:30 do dia anterior em São Paulo.
    expect(csv).toContain("F48-00001;1234,56;01/10/2026;30/09/2026 23:30;Sim\r\n");
    expect(csv).toContain('"Vestido ""rosa""; P";0,05;31/01/2026;;Não\r\n');
  });
  it("não deixa texto virar fórmula", () => {
    expect(celulaCsv("=SOMA(A1)")).toBe("'=SOMA(A1)");
    expect(celulaCsv(-150, "reais")).toBe("-1,50");
  });
});

describe("Excel", () => {
  it("monta o .xlsx com cabeçalho, números em reais e datas do Excel", () => {
    const arquivos = unzipSync(gerarXlsx(colunas, linhas, "Peças"));
    expect(Object.keys(arquivos).sort()).toEqual(
      [
        "[Content_Types].xml",
        "_rels/.rels",
        "xl/_rels/workbook.xml.rels",
        "xl/styles.xml",
        "xl/workbook.xml",
        "xl/worksheets/sheet1.xml",
      ].sort(),
    );
    const aba = strFromU8(arquivos["xl/worksheets/sheet1.xml"]);
    expect(aba).toContain('<c r="A1" t="inlineStr" s="1"><is><t>Código</t></is></c>');
    expect(aba).toContain('<c r="B2" s="2"><v>1234.56</v></c>');
    // 01/10/2026 = 46296 no Excel.
    expect(aba).toContain('<c r="C2" s="3"><v>46296</v></c>');
    expect(aba).toContain("Vestido &quot;rosa&quot;; P");
    expect(aba).toContain('<autoFilter ref="A1:E3"/>');
    expect(strFromU8(arquivos["xl/workbook.xml"])).toContain('name="Peças"');
  });
});
