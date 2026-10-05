"use client";

import { useEffect, useState } from "react";
import { baixarArquivo, fotoEmJpeg, linkDoWhatsApp } from "@/componentes/compartilhar";
import estilos from "../formulario.module.css";

export type PostDoGrupo = { id: string; nome: string; sugerido: boolean; texto: string };

/**
 * Post pronto para os grupos de WhatsApp: escolhe o grupo (o sugerido vem
 * marcado), mostra o texto com o link marcado e deixa copiar, baixar a foto
 * ou abrir o WhatsApp com o texto pronto.
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

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Texto copiado. Agora é só colar no grupo.");
    } catch {
      setAviso("Não deu para copiar sozinho. Selecione o texto e copie.");
    }
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
        <a className={estilos.botao} href={linkDoWhatsApp(texto)} target="_blank" rel="noopener noreferrer">
          Compartilhar no WhatsApp
        </a>
        <button type="button" className={estilos.botaoSecundario} onClick={copiar}>
          Copiar texto
        </button>
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
        &quot;Compartilhar no WhatsApp&quot; abre o WhatsApp com o texto pronto, para escolher o grupo. Baixe a foto para mandar
        junto. O link do post leva a marca do grupo, e a compra por ele conta para o grupo.
      </p>
    </div>
  );
}
