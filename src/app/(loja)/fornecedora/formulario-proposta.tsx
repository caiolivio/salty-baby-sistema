"use client";

import { startTransition, useActionState, useState } from "react";
import { reduzirFoto } from "@/componentes/reduzir-foto";
import { CONSERVACOES, GENEROS } from "@/lib/pecas/dados";
import { TAMANHOS } from "@/lib/tamanhos";
import estilos from "../loja.module.css";
import { enviarProposta } from "./acoes";

/** Mais uma peça para a Salty avaliar: foto e detalhes. */
export function FormularioProposta({ categorias }: { categorias: { id: string; nome: string }[] }) {
  const [estado, despachar, enviando] = useActionState(enviarProposta, undefined);
  const [preparando, setPreparando] = useState(false);
  const [foto, setFoto] = useState<{ arquivo: File; previa: string } | null>(null);
  const v = (campo: string) => estado?.valores?.[campo] ?? "";

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    setPreparando(true);
    const dados = new FormData(formulario);
    dados.delete("foto_escolhida");
    if (foto) dados.set("foto", await reduzirFoto(foto.arquivo), "foto.jpg");
    setPreparando(false);
    startTransition(() => despachar(dados));
  }

  // Depois de enviar com sucesso, o formulário volta limpo (a chave muda).
  const chave = estado?.ok ? `ok-${estado.ok}` : "formulario";
  return (
    <form onSubmit={enviar} className={`${estilos.formConta} ${estilos.formLargo}`} key={chave}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p className={estilos.sucesso} role="status">
          {estado.ok}
        </p>
      )}
      <div className={estilos.fotoInscricao}>
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia da foto escolhida
          <img src={foto.previa} alt="Foto da peça" />
        ) : (
          <span className={estilos.semFoto}>Sem foto</span>
        )}
        <label className={estilos.botaoFoto}>
          {foto ? "Trocar foto" : "Tirar ou escolher foto"}
          <input
            name="foto_escolhida"
            type="file"
            accept="image/*"
            className={estilos.escondido}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (!arquivo) return;
              if (foto) URL.revokeObjectURL(foto.previa);
              setFoto({ arquivo, previa: URL.createObjectURL(arquivo) });
            }}
          />
        </label>
      </div>
      <label>
        Nome da peça
        <input name="nome" required maxLength={160} placeholder="Ex.: Vestido de festa" defaultValue={v("nome")} />
      </label>
      <label>
        Descrição
        <textarea
          name="descricao"
          rows={3}
          required
          maxLength={1000}
          placeholder="Como é a peça, se tem algum detalhe ou marca de uso"
          defaultValue={v("descricao")}
        />
      </label>
      <div className={estilos.linhaCampos}>
        <label>
          Categoria
          <select name="categoriaId" defaultValue={v("categoriaId")}>
            <option value="">Escolha</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tamanho
          <select name="tamanho" defaultValue={v("tamanho")}>
            <option value="">Escolha</option>
            {TAMANHOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={estilos.linhaCampos}>
        <label>
          Para quem
          <select name="genero" defaultValue={v("genero")}>
            <option value="">Escolha</option>
            {GENEROS.map((g) => (
              <option key={g.valor} value={g.valor}>
                {g.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Conservação
          <select name="conservacao" defaultValue={v("conservacao")}>
            <option value="">Escolha</option>
            {CONSERVACOES.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Marca
        <input name="marca" maxLength={80} defaultValue={v("marca")} />
      </label>
      <button type="submit" className={estilos.botaoWhats} disabled={enviando || preparando}>
        {preparando ? "Preparando a foto…" : enviando ? "Enviando…" : "Enviar peça para avaliação"}
      </button>
    </form>
  );
}
