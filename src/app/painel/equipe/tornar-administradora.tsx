"use client";

import { useFormStatus } from "react-dom";
import estilos from "../formulario.module.css";
import { tornarAdministradora } from "./acoes";

function Botao({ nome }: { nome: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={estilos.botaoPerigo}
      disabled={pending}
      onClick={(e) => {
        if (!confirm(`Dar a ${nome} todos os poderes do painel, os mesmos que você tem?`)) e.preventDefault();
      }}
    >
      {pending ? "Salvando…" : "Tornar administradora"}
    </button>
  );
}

export function TornarAdministradora({ id, nome }: { id: string; nome: string }) {
  return (
    <form action={tornarAdministradora}>
      <input type="hidden" name="id" value={id} />
      <Botao nome={nome} />
    </form>
  );
}
