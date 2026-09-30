"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import estilos from "../formulario.module.css";

const nadaMuda = () => () => {};

async function emJpeg(imagem: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(imagem);
  const tela = document.createElement("canvas");
  tela.width = bitmap.width;
  tela.height = bitmap.height;
  const pincel = tela.getContext("2d");
  if (!pincel) throw new Error("sem canvas");
  pincel.fillStyle = "#fff";
  pincel.fillRect(0, 0, tela.width, tela.height);
  pincel.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) =>
    tela.toBlob((b) => (b ? resolve(b) : reject(new Error("sem jpeg"))), "image/jpeg", 0.9),
  );
}

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
    fetch(fotoUrl)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then(emJpeg)
      .then((jpeg) => {
        if (ativo) setArquivo(new File([jpeg], fotoNome, { type: "image/jpeg" }));
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [fotoUrl, fotoNome]);
  const [linkDaFoto, setLinkDaFoto] = useState<string | null>(null);
  useEffect(() => {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    queueMicrotask(() => setLinkDaFoto(url));
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  // Só o navegador sabe se compartilha (celular); no servidor o botão não aparece.
  const podeCompartilhar = useSyncExternalStore(
    nadaMuda,
    () => typeof navigator.share === "function",
    () => false,
  );
  const vaiComFoto = !!arquivo && typeof navigator !== "undefined" && navigator.canShare?.({ files: [arquivo] }) === true;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Texto copiado. Agora é só colar no grupo.");
    } catch {
      setAviso("Não deu para copiar sozinho. Selecione o texto e copie.");
    }
  }

  async function compartilhar() {
    // O texto também vai para a área de transferência, caso o WhatsApp não o mostre junto da foto.
    await navigator.clipboard?.writeText(texto).catch(() => {});
    try {
      await navigator.share(arquivo && vaiComFoto ? { files: [arquivo], text: texto } : { text: texto });
      setAviso("");
    } catch (erro) {
      if (!(erro instanceof DOMException && erro.name === "AbortError")) {
        setAviso("Não deu para compartilhar. Copie o texto e baixe a foto.");
      }
    }
  }

  if (posts.length === 0) return <p>Nenhum grupo em uso. Inclua os grupos em Grupos.</p>;

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
        {foto && (
          <a className={estilos.botaoSecundario} href={linkDaFoto ?? foto.url} download={foto.nome}>
            Baixar foto
          </a>
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
