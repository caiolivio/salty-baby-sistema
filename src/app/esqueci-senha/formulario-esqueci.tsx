"use client";

import { useActionState } from "react";
import estilos from "@/componentes/formulario.module.css";
import { Desafio } from "@/componentes/desafio";
import { pedirNovaSenha } from "./acoes";

export function FormularioEsqueci({ desafio }: { desafio: { imagem: string; ficha: string } }) {
  const [estado, acao, enviando] = useActionState(pedirNovaSenha, undefined);

  if (estado?.enviado) {
    return (
      <p className={estilos.explicacao} role="status">
        Se existe uma conta com o e-mail <strong>{estado.enviado}</strong>, mandamos para ele um link para criar a nova senha. Ele vale
        por 1 hora. Olhe também a caixa de spam.
      </p>
    );
  }
  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <label className={estilos.campo}>
        E-mail da sua conta
        <input name="email" type="email" autoComplete="email" required maxLength={191} defaultValue={estado?.email} />
      </label>
      <Desafio inicial={estado?.desafio ?? desafio} />
      <button className={estilos.botao} type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Receber o link por e-mail"}
      </button>
    </form>
  );
}
