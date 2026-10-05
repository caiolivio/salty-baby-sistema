"use client";

import { useEffect, useState } from "react";
import { baixarArquivo, compartilharNoCelular, fotoEmJpeg, linkDoWhatsApp, usePodeCompartilhar } from "@/componentes/compartilhar";
import estilos from "../formulario.module.css";

export type PostDoGrupo = { id: string; nome: string; sugerido: boolean; texto: string };

/**
 * Post pronto para os grupos de WhatsApp: escolhe o grupo (o sugerido vem
 * marcado), mostra o texto com o link marcado e deixa copiar, baixar a foto
 * ou, no celular, compartilhar foto e texto direto no WhatsApp.
 */
export function DivulgarNoGrupo({ posts, foto }: { posts: PostDoGrupo[]; foto: { url: string; nome: string } | null }) {
  const [grupoId, setGrupoId] = useState((posts.find((p) => p.sugerido) ?? posts[0])?.id ?? "");
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [aviso, setAviso] = useState("");
  const post = posts.find((p) => p.id === grupoId);
  const texto = textos[grupoId] ?? post?.texto ?? "";
  const sugeridos = posts.filter((p) => p.sugerido).map((p) => p.nome);

  // A foto é preparada antes do toque em "Compartilhar", porque o celular só
  // abre o compartilhamento logo depois do toque. Vai em JPEG, porque o
  // WhatsApp trata imagens WebP como figurinha.
  const fotoUrl = foto?.url;
  const fotoNome = foto?.nome ?? "foto.jpg";
  useEffect(() => {
    if (!fotoUrl) return;
    let ativo = true;
    fotoEmJpeg(fotoUrl, fotoNome)
      .then((jpeg) => {
        if (ativo) setArquivo(jpeg);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [fotoUrl, fotoNome]);
  const podeCompartilhar = usePodeCompartilhar();
  const vaiComFoto = !!arquivo && typeof navigator !== "undefined" && navigator.canShare?.({ files: [arquivo] }) === true;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Texto copiado. Agora é só colar no grupo.");
    } catch {
      setAviso("Não deu para copiar sozinho. Selecione o texto e copie.");
    }
  }

  // Sem nenhuma espera antes: o celular só abre o compartilhamento logo depois do toque.
  function compartilhar() {
    compartilharNoCelular(texto, arquivo && vaiComFoto ? [arquivo] : []).then((resultado) => {
      if (resultado === "ok") setAviso(vaiComFoto ? "Se o texto não aparecer junto da foto, ele já está copiado: é só colar." : "");
      else if (resultado === "erro") {
        setAviso("O celular não abriu o compartilhamento. Toque em \"Abrir no WhatsApp\" para mandar o texto e anexe a foto baixada.");
      }
    });
  }

  if (posts.length === 0) return <p>Nenhum grupo em uso. Inclua os grupos em WhatsApp Marketing.</p>;

  return (
    <div className={estilos.formulario}>
      <p>
        {sugeridos.length > 0 ? (
          <>
            Grupo sugerido: <strong>{sugeridos.join(" e ")}</strong>
          </>
        ) : (
          "Nenhum grupo sugerido para esta peça. Escolha um."
        )}
      </p>
      <div className={estilos.marcas} role="radiogroup" aria-label="Grupo">
        {posts.map((p) => (
          <label key={p.id} className={estilos.marca}>
            <input
              type="radio"
              name="grupo-post"
              value={p.id}
              checked={p.id === grupoId}
              onChange={() => {
                setGrupoId(p.id);
                setAviso("");
              }}
            />
            {p.nome}
            {p.sugerido && " ★"}
          </label>
        ))}
      </div>
      <label className={estilos.campo}>
        Texto do post (dá para ajustar antes de copiar)
        <textarea
          rows={7}
          value={texto}
          onChange={(e) => setTextos((atuais) => ({ ...atuais, [grupoId]: e.target.value }))}
        />
      </label>
      <div className={estilos.acoes}>
        {podeCompartilhar && (
          <button type="button" className={estilos.botao} onClick={compartilhar}>
            Compartilhar {vaiComFoto ? "foto e texto" : "texto"}
          </button>
        )}
        <button type="button" className={podeCompartilhar ? estilos.botaoSecundario : estilos.botao} onClick={copiar}>
          Copiar texto
        </button>
        <a className={estilos.botaoSecundario} href={linkDoWhatsApp(texto)} target="_blank" rel="noopener noreferrer">
          Abrir no WhatsApp (só o texto)
        </a>
        {foto && (
          <button
            type="button"
            className={estilos.botaoSecundario}
            onClick={() => (arquivo ? baixarArquivo(arquivo) : window.open(foto.url, "_blank"))}
          >
            Baixar foto
          </button>
        )}
      </div>
      {aviso && (
        <p className={estilos.aviso} role="status">
          {aviso}
        </p>
      )}
      <p className={estilos.dica}>
        No celular, &quot;Compartilhar&quot; abre o WhatsApp com a foto e o texto. No computador, copie o texto e baixe a foto.
        O link do post leva a marca do grupo, e a compra por ele conta para o grupo.
      </p>
    </div>
  );
}
