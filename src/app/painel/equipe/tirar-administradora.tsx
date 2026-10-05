"use client";

import { useActionState } from "react";
import estilos from "../formulario.module.css";
import { tirarAdministradoraDaEquipe } from "./acoes";

export function TirarAdministradora({ id, nome }: { id: string; nome: string }) {
  const [estado, acao, enviando] = useActionState(tirarAdministradoraDaEquipe, undefined);
  return (
    <form action={acao}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={estilos.botaoPerigo}
        disabled={enviando}
        onClick={(e) => {
          if (!confirm(`Tirar ${nome} da equipe? A pessoa perde o acesso ao painel na hora.`)) e.preventDefault();
        }}
      >
        {enviando ? "Tirando…" : "Tirar da equipe"}
      </button>
    </form>
  );
}
