"use client";

import { useEffect, useState } from "react";
import {
  baixarArquivo,
  compartilharNoCelular,
  emLevas,
  fotoEmJpeg,
  linkDoWhatsApp,
  usePodeCompartilhar,
} from "@/componentes/compartilhar";
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
  inicial,
}: {
  grupos: { id: string; nome: string; codigo: string }[];
  sugeridoId?: string;
  pecas: PecaComFoto[];
  origem: string;
  /** Título e texto já prontos (resumo semanal): não usa o que está guardado no navegador. */
  inicial?: { titulo: string; texto: string };
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  // Enquanto a administradora não escolhe, vale o grupo sugerido para as peças da lista.
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const grupoId = escolhido ?? sugeridoId ?? "";
  const [fotosProntas, setFotosProntas] = useState<Record<string, File>>({});
  const [aviso, setAviso] = useState("");
  const podeCompartilhar = usePodeCompartilhar();

  useEffect(() => {
    if (inicial) return;
    const guardado = lerGuardado();
    queueMicrotask(() => {
      setTitulo(guardado.titulo);
      setTexto(guardado.texto);
    });
    // Só na primeira vez: o texto pronto não muda depois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function guardar(mudanca: { titulo?: string; texto?: string }) {
    if (inicial) return;
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
  // O Android aceita no máximo 10 fotos por vez: com mais, o envio é feito em levas.
  const levas = emLevas(arquivos);
  const vaiComFotos = levas.length === 1 && aceitaFotos(arquivos);
  const textoDaPeca = (p: PecaComFoto) => textoDoPost(p, linkDaPeca(origem, p.codigo, grupo?.codigo));

  async function copiar(conteudo: string, oQue = "Texto") {
    try {
      await navigator.clipboard.writeText(conteudo);
      setAviso(`${oQue} copiado. Agora é só colar no grupo.`);
    } catch {
      setAviso("Não deu para copiar sozinho. Selecione o texto da prévia e copie.");
    }
  }

  // Sem nenhuma espera antes: o celular só abre o compartilhamento logo depois do toque.
  function compartilhar(conteudo: string, fotos: File[]) {
    const comFotos = aceitaFotos(fotos);
    compartilharNoCelular(conteudo, fotos).then((resultado) => {
      if (resultado === "ok") {
        setAviso(comFotos && conteudo ? "Se o texto não aparecer junto da foto, ele já está copiado: é só colar." : "");
      } else if (resultado === "erro") {
        setAviso(
          "O celular não abriu o compartilhamento. Toque em \"Compartilhar no WhatsApp\" para mandar o texto e anexe as fotos baixadas.",
        );
      }
    });
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
        {pecas.length > 0 && (
          <a className={estilos.botao} href={linkDoWhatsApp(post)} target="_blank" rel="noopener noreferrer">
            Compartilhar no WhatsApp
          </a>
        )}
        {podeCompartilhar && levas.length <= 1 && (
          <button
            type="button"
            className={estilos.botaoSecundario}
            onClick={() => compartilhar(post, arquivos)}
            disabled={pecas.length === 0}
          >
            {vaiComFotos ? `Enviar com as ${arquivos.length} foto(s)` : "Enviar pelo celular"}
          </button>
        )}
        {podeCompartilhar &&
          levas.length > 1 &&
          levas.map((leva, i) => {
            const primeira = i * 10 + 1;
            const ultima = primeira + leva.length - 1;
            return (
              <button
                key={primeira}
                type="button"
                className={estilos.botaoSecundario}
                onClick={() => compartilhar(i === 0 ? post : "", leva)}
              >
                {i === 0 ? `Enviar com as fotos ${primeira} a ${ultima}` : `Enviar as fotos ${primeira} a ${ultima}`}
              </button>
            );
          })}
        <button
          type="button"
          className={estilos.botaoSecundario}
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
        &quot;Compartilhar no WhatsApp&quot; abre o WhatsApp com o texto pronto, para escolher o grupo. &quot;Enviar com as
        fotos&quot; (no celular) manda as fotos e o texto juntos; o Android aceita até 10 fotos por vez. Cada link leva a marca
        do grupo, e a compra por ele conta para o grupo.
      </p>
      {pecas.length > 0 && (
        <div>
          <strong>Enviar peça por peça</strong>
          <ol className={proprios.porPeca}>
            {abertura && (
              <li>
                <pre className={proprios.previa}>{abertura}</pre>
                <div className={estilos.acoes}>
                  <a className={estilos.botao} href={linkDoWhatsApp(abertura)} target="_blank" rel="noopener noreferrer">
                    Compartilhar no WhatsApp
                  </a>
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
                    <a className={estilos.botao} href={linkDoWhatsApp(legenda)} target="_blank" rel="noopener noreferrer">
                      Compartilhar no WhatsApp
                    </a>
                    <button type="button" className={estilos.botaoSecundario} onClick={() => copiar(legenda)}>
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
