"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { reduzirFotosDoFormulario } from "@/componentes/reduzir-foto";
import estilos from "../formulario.module.css";
import { enviarFotos } from "./acoes";

/** Botão para acrescentar fotos a uma peça já cadastrada. */
export function AdicionarFotos({ pecaId }: { pecaId: string }) {
  const [estado, despachar, enviando] = useActionState(enviarFotos, undefined);
  const [preparando, setPreparando] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const alvo = evento.currentTarget;
    setPreparando(true);
    const dados = await reduzirFotosDoFormulario(new FormData(alvo));
    setPreparando(false);
    startTransition(() => despachar(dados));
    alvo.reset();
  }

  return (
    <form ref={formulario} onSubmit={enviar} className={estilos.acoes}>
      <input type="hidden" name="id" value={pecaId} />
      <label className={estilos.campo}>
        Acrescentar fotos
        <input
          name="fotos"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={() => formulario.current?.requestSubmit()}
        />
      </label>
      {(preparando || enviando) && <span role="status">Enviando…</span>}
      {estado?.aviso && !enviando && <span role="status">{estado.aviso}</span>}
      {estado?.erro && !enviando && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
