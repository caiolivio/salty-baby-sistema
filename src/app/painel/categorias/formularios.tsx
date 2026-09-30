"use client";

import { useActionState } from "react";
import estilos from "../formulario.module.css";
import { novaCategoria, salvarCategoria } from "./acoes";

export function NovaCategoria() {
  const [estado, enviar, enviando] = useActionState(novaCategoria, undefined);
  return (
    <form action={enviar} className={estilos.formulario} key={estado?.aviso ?? ""}>
      <label className={estilos.campo}>
        Nova categoria
        <input name="nome" required minLength={2} maxLength={60} placeholder="Ex.: Enxoval" />
      </label>
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
      <div className={estilos.acoes}>
        <button className={estilos.botao} type="submit" disabled={enviando}>
          {enviando ? "Incluindo…" : "Incluir categoria"}
        </button>
      </div>
    </form>
  );
}

export function EditarCategoria({ id, nome, ativa, pecas }: { id: string; nome: string; ativa: boolean; pecas: number }) {
  const [estado, enviar, enviando] = useActionState(salvarCategoria, undefined);
  return (
    <form action={enviar} className={estilos.linhaCategoria}>
      <input type="hidden" name="id" value={id} />
      <label className={estilos.campo}>
        <span className={estilos.escondido}>Nome</span>
        <input name="nome" required minLength={2} maxLength={60} defaultValue={nome} />
      </label>
      <label className={estilos.marcar}>
        <input type="checkbox" name="ativa" value="sim" defaultChecked={ativa} />
        Aparece no cadastro
      </label>
      <span className={estilos.dica}>{pecas} peça(s)</span>
      <button className={estilos.botaoSecundario} type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar"}
      </button>
      {estado?.erro && (
        <span className={estilos.erro} role="alert">
          {estado.erro}
        </span>
      )}
      {estado?.aviso && !enviando && <span role="status">{estado.aviso}</span>}
    </form>
  );
}
