/** Lê um CSV (padrão do Notion: vírgula, aspas duplas, quebras de linha dentro de aspas). */
export function lerCsv(texto: string): Record<string, string>[] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let entreAspas = false;
  const t = texto.replace(/^﻿/, "");

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entreAspas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  const [cabecalho, ...dados] = linhas;
  if (!cabecalho) return [];
  return dados
    .filter((l) => l.some((v) => v.trim() !== ""))
    .map((l) => Object.fromEntries(cabecalho.map((nome, i) => [nome, l[i] ?? ""])));
}
