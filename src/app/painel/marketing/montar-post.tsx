"use client";

import { useEffect, useState } from "react";
import { baixarArquivo, fotoEmJpeg, usePodeCompartilhar } from "@/componentes/compartilhar";
import { aberturaDaDivulgacao, linkDaPeca, textoDaDivulgacao, textoDoPost, type PecaDoPost } from "@/lib/grupos/regras";
import estilos from "../formulario.module.css";
import proprios from "./marketing.module.css";

type PecaComFoto = PecaDoPost & { foto: string | null };

// Título e texto ficam guardados neste navegador, para não se perderem ao buscar mais peças.
const GUARDADO = "salty-divulgacao";

function lerGuardado(): { titulo: string; texto: string } {
  try {
    const dados = JSON.parse(localStorage.getItem(GUARDADO) ?? "{}");
    return {
      titulo: typeof dados.titulo === "string" ? dados.titulo : "",
      texto: typeof dados.texto === "string" ? dados.texto : "",
    };
  } catch {
    return { titulo: "", texto: "" };
  }
}

/**
 * Monta o post com várias peças: grupo (o sugerido vem marcado), título,
 * texto e cada peça com uma informação por linha. Dá para mandar tudo de uma
 * vez ou peça por peça (cada foto com o texto dela, como no WhatsApp).
 */
export function MontarPost({
  grupos,
  sugeridoId,
  pecas,
  origem,
}: {
  grupos: { id: string; nome: string; codigo: string }[];
  sugeridoId?: string;
  pecas: PecaComFoto[];
  origem: string;
}) {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  // Enquanto a administradora não escolhe, vale o grupo sugerido para as peças da lista.
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const grupoId = escolhido ?? sugeridoId ?? "";
  const [fotosProntas, setFotosProntas] = useState<Record<string, File>>({});
  const [aviso, setAviso] = useState("");
  const podeCompartilhar = usePodeCompartilhar();

  useEffect(() => {
    const guardado = lerGuardado();
    queueMicrotask(() => {
      setTitulo(guardado.titulo);
      setTexto(guardado.texto);
    });
  }, []);

  function guardar(mudanca: { titulo?: string; texto?: string }) {
    try {
      localStorage.setItem(GUARDADO, JSON.stringify({ titulo, texto, ...mudanca }));
    } catch {
      // Sem armazenamento (janela anônima): o texto só não fica guardado.
    }
  }

  // As fotos são preparadas antes do toque em "Compartilhar", porque o celular
  // só abre o compartilhamento logo depois do toque.
  const fotos = pecas.filter((p) => p.foto).map((p) => `${p.codigo}|${p.foto}`);
  const chaveFotos = fotos.join(",");
  useEffect(() => {
    let ativo = true;
    Promise.all(
      chaveFotos
        .split(",")
        .filter(Boolean)
        .map((item) => {
          const [codigo, url] = item.split("|");
          return fotoEmJpeg(url, `${codigo}.jpg`).catch(() => null);
        }),
    ).then((prontas) => {
      if (ativo) setFotosProntas(Object.fromEntries(prontas.filter((f): f is File => f !== null).map((f) => [f.name, f])));
    });
    return () => {
      ativo = false;
    };
  }, [chaveFotos]);

  const grupo = grupos.find((g) => g.id === grupoId);
  const post = textoDaDivulgacao({ titulo, texto, pecas, origem, codigoGrupo: grupo?.codigo });
  const abertura = aberturaDaDivulgacao(titulo, texto);
  const fotoDe = (codigo: string) => fotosProntas[`${codigo}.jpg`];
  const arquivos = pecas.map((p) => fotoDe(p.codigo)).filter((f): f is File => Boolean(f));
  const aceitaFotos = (lista: File[]) =>
    lista.length > 0 && typeof navigator !== "undefined" && navigator.canShare?.({ files: lista }) === true;
  const vaiComFotos = aceitaFotos(arquivos);
  const textoDaPeca = (p: PecaComFoto) => textoDoPost(p, linkDaPeca(origem, p.codigo, grupo?.codigo));

  async function copiar(conteudo: string, oQue = "Texto") {
    try {
      await navigator.clipboard.writeText(conteudo);
      setAviso(`${oQue} copiado. Agora é só colar no grupo.`);
    } catch {
      setAviso("Não deu para copiar sozinho. Selecione o texto da prévia e copie.");
    }
  }

  async function compartilhar(conteudo: string, fotos: File[]) {
    // O texto também vai para a área de transferência, caso o WhatsApp mostre só as fotos.
    await navigator.clipboard?.writeText(conteudo).catch(() => {});
    const comFotos = aceitaFotos(fotos);
    try {
      await navigator.share(comFotos ? { files: fotos, text: conteudo } : { text: conteudo });
      setAviso(comFotos ? "Se o texto não aparecer junto da foto, ele já está copiado: é só colar." : "");
    } catch (erro) {
      if (!(erro instanceof DOMException && erro.name === "AbortError")) {
        setAviso("Não deu para compartilhar. Copie o texto e baixe a foto.");
      }
    }
  }

  async function baixarFotos() {
    for (const arquivo of arquivos) {
      baixarArquivo(arquivo);
      await new Promise((pronto) => setTimeout(pronto, 400));
    }
  }

  return (
    <div className={estilos.formulario}>
      <label className={estilos.campo}>
        Grupo
        <select
          value={grupoId}
          onChange={(e) => {
            setEscolhido(e.target.value);
            setAviso("");
          }}
        >
          <option value="">Sem grupo (link sem marca)</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
              {g.id === sugeridoId ? " (sugerido)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className={estilos.campo}>
        Título
        <input
          value={titulo}
          maxLength={120}
          placeholder="Ex.: Destaques da semana para meninos RN"
          onChange={(e) => {
            setTitulo(e.target.value);
            guardar({ titulo: e.target.value });
          }}
        />
      </label>
      <label className={estilos.campo}>
        Texto
        <textarea
          rows={3}
          value={texto}
          maxLength={1000}
          placeholder="Ex.: Chegaram novidades lindas! Para comprar, é só clicar no link da peça."
          onChange={(e) => {
            setTexto(e.target.value);
            guardar({ texto: e.target.value });
          }}
        />
      </label>
      <div>
        <strong>Prévia do post</strong>
        <pre className={proprios.previa}>{post}</pre>
      </div>
      <div className={estilos.acoes}>
        {podeCompartilhar && (
          <button
            type="button"
            className={estilos.botao}
            onClick={() => compartilhar(post, arquivos)}
            disabled={pecas.length === 0}
          >
            Compartilhar tudo ({vaiComFotos ? `${arquivos.length} foto(s) e texto` : "texto"})
          </button>
        )}
        <button
          type="button"
          className={podeCompartilhar ? estilos.botaoSecundario : estilos.botao}
          onClick={() => copiar(post)}
          disabled={pecas.length === 0}
        >
          Copiar todo o texto
        </button>
        {arquivos.length > 0 && (
          <button type="button" className={estilos.botaoSecundario} onClick={baixarFotos}>
            Baixar {arquivos.length} foto(s)
          </button>
        )}
      </div>
      {aviso && (
        <p className={estilos.aviso} role="status">
          {aviso}
        </p>
      )}
      <p className={estilos.dica}>
        &quot;Compartilhar tudo&quot; manda as fotos juntas e o texto inteiro numa mensagem só. Para cada foto ir com o texto
        dela embaixo, use &quot;Enviar peça por peça&quot;. Cada link leva a marca do grupo, e a compra por ele conta para o
        grupo.
      </p>
      {pecas.length > 0 && (
        <div>
          <strong>Enviar peça por peça</strong>
          <ol className={proprios.porPeca}>
            {abertura && (
              <li>
                <pre className={proprios.previa}>{abertura}</pre>
                <div className={estilos.acoes}>
                  {podeCompartilhar && (
                    <button type="button" className={estilos.botaoSecundario} onClick={() => compartilhar(abertura, [])}>
                      Compartilhar título e texto
                    </button>
                  )}
                  <button type="button" className={estilos.botaoSecundario} onClick={() => copiar(abertura, "Título e texto")}>
                    Copiar título e texto
                  </button>
                </div>
              </li>
            )}
            {pecas.map((p) => {
              const foto = fotoDe(p.codigo);
              const legenda = textoDaPeca(p);
              return (
                <li key={p.codigo}>
                  <div className={proprios.pecaDoPost}>
                    {p.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element -- foto já reduzida
                      <img src={p.foto} alt={p.nome} />
                    ) : (
                      <span className={proprios.semFoto}>Sem foto</span>
                    )}
                    <pre className={proprios.previa}>{legenda}</pre>
                  </div>
                  <div className={estilos.acoes}>
                    {podeCompartilhar && (
                      <button
                        type="button"
                        className={estilos.botao}
                        onClick={() => compartilhar(legenda, foto ? [foto] : [])}
                      >
                        Compartilhar {foto ? "foto e texto" : "texto"}
                      </button>
                    )}
                    <button
                      type="button"
                      className={podeCompartilhar ? estilos.botaoSecundario : estilos.botao}
                      onClick={() => copiar(legenda)}
                    >
                      Copiar texto
                    </button>
                    {foto && (
                      <button type="button" className={estilos.botaoSecundario} onClick={() => baixarArquivo(foto)}>
                        Baixar foto
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
