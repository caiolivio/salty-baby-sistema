"use client";

import { useFormStatus } from "react-dom";
import estilos from "../formulario.module.css";
import { excluir } from "./acoes";

function Botao({ codigo }: { codigo: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={estilos.botaoPerigo}
      disabled={pending}
      onClick={(e) => {
        if (!confirm(`Excluir a peça ${codigo} de vez? As fotos também são apagadas, e isso não pode ser desfeito.`)) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "Excluindo…" : "Excluir peça"}
    </button>
  );
}

/** Botão de excluir com confirmação. Só aparece para a administradora. */
export function ExcluirPeca({ id, codigo }: { id: string; codigo: string }) {
  return (
    <form action={excluir}>
      <input type="hidden" name="id" value={id} />
      <Botao codigo={codigo} />
    </form>
  );
}
