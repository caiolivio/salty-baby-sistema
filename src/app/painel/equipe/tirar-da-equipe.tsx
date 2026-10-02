"use client";

import { useFormStatus } from "react-dom";
import estilos from "../formulario.module.css";
import { tirarSuporte } from "./acoes";

function Botao({ nome }: { nome: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={estilos.botaoPerigo}
      disabled={pending}
      onClick={(e) => {
        if (!confirm(`Tirar ${nome} da equipe? A pessoa perde o acesso ao painel na hora.`)) e.preventDefault();
      }}
    >
      {pending ? "Tirando…" : "Tirar da equipe"}
    </button>
  );
}

export function TirarDaEquipe({ id, nome }: { id: string; nome: string }) {
  return (
    <form action={tirarSuporte}>
      <input type="hidden" name="id" value={id} />
      <Botao nome={nome} />
    </form>
  );
}
