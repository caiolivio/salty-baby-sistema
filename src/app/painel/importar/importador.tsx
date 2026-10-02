"use client";

import { unzipSync } from "fflate";
import Link from "next/link";
import { useRef, useState } from "react";
import type { ArquivosNotion } from "@/lib/importacao/notion";
import type { ResumoImportacao } from "@/lib/importacao/resumo";
import { analisarNotion, fotosPendentes, importarNotion, type FotoParaEnviar } from "./acoes";
import estilos from "./importar.module.css";

const BASES: Record<keyof ArquivosNotion, RegExp> = {
  produtos: /^produtos_.*_all\.csv$/,
  fornecedoras: /^fornecedores_.*_all\.csv$/,
  clientes: /^clientes_.*_all\.csv$/,
  vendas: /^vendas_.*_all\.csv$/,
};

const nomeDoArquivo = (caminho: string) => caminho.split("/").pop() ?? caminho;
const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SITUACOES: Record<string, string> = {
  publicada: "à venda",
  vendida: "vendidas",
  enviada: "vendidas e enviadas",
  rascunho: "em rascunho",
};

type Etapa =
  | { nome: "escolher"; erro?: string }
  | { nome: "lendo" }
  | { nome: "conferir"; resumo: ResumoImportacao }
  | { nome: "gravando" }
  | { nome: "fotos"; total: number; feitas: number; falhas: string[] }
  | { nome: "pronto"; falhas: string[] };

/** Lê as quatro bases do export do Notion (o .zip baixado do Notion). */
function lerBases(zip: Uint8Array): ArquivosNotion {
  const csvs = unzipSync(zip, { filter: (f) => f.name.endsWith(".csv") });
  const texto = new TextDecoder("utf-8");
  const achar = (padrao: RegExp) => {
    const nome = Object.keys(csvs).find((n) => padrao.test(nomeDoArquivo(n)));
    if (!nome) throw new Error("Este arquivo não parece ser o export do Organiza Brechó.");
    return texto.decode(csvs[nome]);
  };
  return {
    produtos: achar(BASES.produtos),
    fornecedoras: achar(BASES.fornecedoras),
    clientes: achar(BASES.clientes),
    vendas: achar(BASES.vendas),
  };
}

export function ImportadorNotion({ somenteFotos = false }: { somenteFotos?: boolean }) {
  const [etapa, setEtapa] = useState<Etapa>({ nome: "escolher" });
  const zip = useRef<Uint8Array | null>(null);
  const bases = useRef<ArquivosNotion | null>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setEtapa({ nome: "lendo" });
    try {
      zip.current = new Uint8Array(await arquivo.arrayBuffer());
      bases.current = lerBases(zip.current);
      if (somenteFotos) {
        const r = await fotosPendentes(bases.current);
        if (!r.ok) return setEtapa({ nome: "escolher", erro: r.erro });
        return enviarFotos(r.fotos);
      }
      const r = await analisarNotion(bases.current);
      setEtapa(r.ok ? { nome: "conferir", resumo: r.resumo } : { nome: "escolher", erro: r.erro });
    } catch (erro) {
      setEtapa({ nome: "escolher", erro: erro instanceof Error ? erro.message : "Não consegui abrir o arquivo." });
    }
  }

  async function importar() {
    if (!bases.current) return;
    setEtapa({ nome: "gravando" });
    const r = await importarNotion(bases.current);
    if (!r.ok) return setEtapa({ nome: "escolher", erro: r.erro });
    await enviarFotos(r.fotos);
  }

  async function enviarFotos(fotos: FotoParaEnviar[]) {
    const falhas: string[] = [];
    let feitas = 0;
    setEtapa({ nome: "fotos", total: fotos.length, feitas, falhas });

    // De 20 em 20, para não abrir todas as fotos na memória de uma vez.
    for (let i = 0; i < fotos.length; i += 20) {
      const lote = fotos.slice(i, i + 20);
      const nomes = new Set(lote.map((f) => f.arquivo));
      const abertas = unzipSync(zip.current!, { filter: (f) => nomes.has(nomeDoArquivo(f.name)) });
      const porNome = new Map(Object.entries(abertas).map(([n, bytes]) => [nomeDoArquivo(n), bytes]));

      await Promise.all(
        [0, 1, 2].map(async (fila) => {
          for (let j = fila; j < lote.length; j += 3) {
            const { codigo, arquivo } = lote[j];
            const bytes = porNome.get(arquivo);
            if (!bytes || !(await enviarFoto(codigo, arquivo, bytes))) falhas.push(`${codigo} (${arquivo})`);
            feitas++;
            setEtapa({ nome: "fotos", total: fotos.length, feitas, falhas: [...falhas] });
          }
        }),
      );
    }
    setEtapa({ nome: "pronto", falhas });
  }

  if (etapa.nome === "escolher" || etapa.nome === "lendo") {
    return (
      <div className={estilos.caixa}>
        <p>
          {somenteFotos
            ? "Escolha de novo o arquivo .zip do Notion para enviar as fotos que faltam."
            : "Escolha o arquivo .zip que o Notion gerou na exportação (Organiza Brechó). Nada é gravado antes de você conferir o resumo."}
        </p>
        {etapa.nome === "escolher" && etapa.erro && (
          <p className={estilos.erro} role="alert">
            {etapa.erro}
          </p>
        )}
        <label className={estilos.botao}>
          {etapa.nome === "lendo" ? "Lendo o arquivo…" : "Escolher o arquivo .zip"}
          <input
            type="file"
            accept=".zip,application/zip"
            hidden
            disabled={etapa.nome === "lendo"}
            onChange={(e) => escolher(e.target.files?.[0])}
          />
        </label>
      </div>
    );
  }

  if (etapa.nome === "conferir") {
    const r = etapa.resumo;
    return (
      <div className={estilos.caixa}>
        <h2 className={estilos.subtitulo}>Confira antes de importar</h2>
        <ul className={estilos.numeros}>
          <li>
            <strong>{r.fornecedoras}</strong> fornecedoras (a próxima nova será a {r.proximaFornecedora})
          </li>
          <li>
            <strong>{r.pecas}</strong> peças, {r.pecasDaLoja} delas da loja (SB), {r.pecasComFoto} com foto:{" "}
            {Object.entries(r.pecasPorSituacao)
              .map(([s, n]) => `${n} ${SITUACOES[s] ?? s}`)
              .join(", ")}
          </li>
          <li>
            <strong>{r.vendas}</strong> vendas com {r.itensVendidos} peças, total de {reais(r.totalVendidoCentavos)} (
            {reais(r.descontosCentavos)} de desconto)
          </li>
          <li>
            Repasse já pago às fornecedoras: {reais(r.repasseJaPagoCentavos)}. Repasse em aberto:{" "}
            <strong>{reais(r.repasseEmAbertoCentavos)}</strong>
          </li>
          <li>
            Lucro da loja nessas vendas, já descontado o repasse: <strong>{reais(r.lucroCentavos)}</strong>
          </li>
          <li>
            <strong>{r.clientes}</strong> clientes
          </li>
        </ul>
        {r.avisos.length > 0 && (
          <details className={estilos.avisos}>
            <summary>{r.avisos.length} pontos para conferir depois</summary>
            <ul>
              {r.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </details>
        )}
        <div className={estilos.acoes}>
          <button className={estilos.botao} onClick={importar}>
            Importar agora
          </button>
          <button className={estilos.botaoSecundario} onClick={() => setEtapa({ nome: "escolher" })}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (etapa.nome === "gravando") {
    return (
      <div className={estilos.caixa} role="status">
        Gravando fornecedoras, peças, clientes e vendas…
      </div>
    );
  }

  if (etapa.nome === "fotos") {
    return (
      <div className={estilos.caixa} role="status">
        <p>
          Enviando as fotos: {etapa.feitas} de {etapa.total}. Deixe esta página aberta até terminar.
        </p>
        <progress className={estilos.progresso} max={etapa.total || 1} value={etapa.feitas} />
      </div>
    );
  }

  return (
    <div className={estilos.caixa} role="status">
      <h2 className={estilos.subtitulo}>Importação concluída</h2>
      {etapa.falhas.length > 0 ? (
        <p className={estilos.erro}>
          {etapa.falhas.length} foto(s) não foram enviadas: {etapa.falhas.join(", ")}. Você pode tentar de novo por esta
          mesma página.
        </p>
      ) : (
        <p>Todas as fotos foram enviadas.</p>
      )}
      <p>
        <Link href="/painel/pecas">Ver as peças</Link>
      </p>
    </div>
  );
}

async function enviarFoto(codigo: string, arquivo: string, bytes: Uint8Array): Promise<boolean> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const dados = new FormData();
    dados.set("codigo", codigo);
    dados.set("foto", new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), arquivo);
    try {
      const resposta = await fetch("/api/importacao/foto", { method: "POST", body: dados });
      if (resposta.ok) return true;
      if (resposta.status < 500) return false;
    } catch {
      // tenta mais uma vez
    }
  }
  return false;
}
