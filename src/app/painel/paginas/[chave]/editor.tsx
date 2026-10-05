"use client";

import { useActionState, useRef, useState } from "react";
import { Bold, Eye, Heading2, Heading3, Link2, List, Pencil } from "lucide-react";
import { TextoDaPagina } from "@/componentes/texto-da-pagina";
import { blocosDoTexto, preencher, TAMANHO_MAXIMO, VARIAVEIS, type DadosDaLoja } from "@/lib/paginas/regras";
import estilos from "../../formulario.module.css";
import proprio from "../paginas.module.css";
import { salvar } from "../acoes";

type Props = {
  chave: string;
  titulo: string;
  conteudo: string;
  publicada: boolean;
  /** Acordo e privacidade: sempre no ar. */
  sempreNoAr: boolean;
  /** Só o acordo: escolher se as fornecedoras aceitam de novo. */
  ehAcordo: boolean;
  loja: DadosDaLoja;
};

export function EditorDePagina(props: Props) {
  const [estado, enviar, enviando] = useActionState(salvar, undefined);
  const inicial = estado?.erro && estado.valores ? estado.valores : undefined;
  const [titulo, setTitulo] = useState(inicial?.titulo ?? props.titulo);
  const [conteudo, setConteudo] = useState(inicial?.conteudo ?? props.conteudo);
  const [aba, setAba] = useState<"editar" | "previa">("editar");
  const caixa = useRef<HTMLTextAreaElement>(null);

  /** Põe a marcação em volta do que está selecionado (ou no começo das linhas). */
  const marcar = (tipo: "titulo" | "subtitulo" | "negrito" | "lista" | "link") => {
    const t = caixa.current;
    if (!t) return;
    const { selectionStart: ini, selectionEnd: fim, value } = t;
    const selecionado = value.slice(ini, fim);
    let novo: string;
    const inicioLinha = value.lastIndexOf("\n", ini - 1) + 1;
    let antes = value.slice(0, ini);
    const depois = value.slice(fim);
    if (tipo === "negrito") novo = `**${selecionado || "texto em negrito"}**`;
    else if (tipo === "link") novo = `[${selecionado || "texto do link"}](https://)`;
    else {
      const prefixo = { titulo: "## ", subtitulo: "### ", lista: "- " }[tipo];
      antes = value.slice(0, inicioLinha);
      const trecho = value.slice(inicioLinha, fim) || (tipo === "lista" ? "item" : "Título");
      novo = trecho
        .split("\n")
        .map((l) => prefixo + l.replace(/^(#{1,3}\s+|[-*•]\s+)/, ""))
        .join("\n");
    }
    const resultado = antes + novo + depois;
    setConteudo(resultado);
    requestAnimationFrame(() => {
      t.focus();
      t.setSelectionRange(antes.length, antes.length + novo.length);
    });
  };

  const BOTOES = [
    { tipo: "titulo", nome: "Título", Icone: Heading2 },
    { tipo: "subtitulo", nome: "Subtítulo", Icone: Heading3 },
    { tipo: "negrito", nome: "Negrito", Icone: Bold },
    { tipo: "lista", nome: "Lista", Icone: List },
    { tipo: "link", nome: "Link", Icone: Link2 },
  ] as const;

  return (
    <form action={enviar} className={estilos.formulario}>
      <input type="hidden" name="chave" value={props.chave} />
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.aviso && (
        <p className={estilos.aviso} role="status">
          {estado.aviso}
        </p>
      )}
      <label className={estilos.campo}>
        Título
        <input name="titulo" required maxLength={160} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </label>

      <div className={proprio.abasEditor} role="tablist">
        <button type="button" role="tab" aria-selected={aba === "editar"} onClick={() => setAba("editar")}>
          <Pencil className="icone" aria-hidden /> Escrever
        </button>
        <button type="button" role="tab" aria-selected={aba === "previa"} onClick={() => setAba("previa")}>
          <Eye className="icone" aria-hidden /> Ver como fica
        </button>
      </div>

      <div className={proprio.lado} data-mostrar={aba}>
        <div className={proprio.escrever}>
          <div className={proprio.ferramentas} role="toolbar" aria-label="Formatação">
            {BOTOES.map(({ tipo, nome, Icone }) => (
              <button key={tipo} type="button" onClick={() => marcar(tipo)} title={nome}>
                <Icone className="icone" aria-hidden />
                <span>{nome}</span>
              </button>
            ))}
          </div>
          <label className={estilos.campo}>
            <textarea
              aria-label="Texto da página"
              ref={caixa}
              name="conteudo"
              required
              rows={24}
              maxLength={TAMANHO_MAXIMO}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className={proprio.caixa}
            />
          </label>
          <details className={proprio.ajuda}>
            <summary>Como formatar e usar os dados da loja</summary>
            <ul>
              <li>
                <code>## Título</code> e <code>### Subtítulo</code> no começo da linha.
              </li>
              <li>
                <code>- item</code> no começo de cada linha vira uma lista.
              </li>
              <li>
                <code>**palavra**</code> deixa em negrito. <code>[texto](https://endereço)</code> vira um link.
              </li>
              <li>Uma linha em branco separa os parágrafos.</li>
            </ul>
            <p>Estas palavras entre chaves são trocadas pelos dados de Configurações da loja (assim o texto se atualiza sozinho):</p>
            <ul>
              {VARIAVEIS.map((v) => (
                <li key={v.nome}>
                  <code>{`{${v.nome}}`}</code>: {v.explica} (hoje: {v.valor(props.loja)})
                </li>
              ))}
            </ul>
          </details>
        </div>
        <div className={proprio.previa} aria-label="Prévia">
          <h1>{preencher(titulo, props.loja)}</h1>
          <TextoDaPagina blocos={blocosDoTexto(preencher(conteudo, props.loja))} />
        </div>
      </div>

      {!props.sempreNoAr && (
        <label className={estilos.marcar}>
          <input type="checkbox" name="publicada" value="sim" defaultChecked={inicial ? inicial.publicada === "sim" : props.publicada} />
          Página no ar (aparece no rodapé do site)
        </label>
      )}
      {props.ehAcordo && (
        <fieldset className={estilos.grupo}>
          <legend>Fornecedoras</legend>
          <label className={estilos.marcar}>
            <input type="radio" name="exigirAceite" value="nao" defaultChecked />
            Mudança pequena (correção de texto): quem já aceitou continua valendo
          </label>
          <label className={estilos.marcar}>
            <input type="radio" name="exigirAceite" value="sim" />
            Mudança nas regras: todas as fornecedoras precisam ler e aceitar de novo
          </label>
          <span className={estilos.dica}>
            Com &quot;aceitar de novo&quot;, cada fornecedora vê o acordo novo no próximo acesso e só volta para a área dela depois
            de aceitar. O aceite anterior fica no histórico de cada uma.
          </span>
        </fieldset>
      )}
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
