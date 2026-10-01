"use client";

import { useState, type InputHTMLAttributes } from "react";
import estilos from "./campo-senha.module.css";

/** Campo de senha com o botão "Mostrar", para a pessoa conferir o que digitou. */
export function CampoSenha(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visivel, setVisivel] = useState(false);
  return (
    <span className={estilos.caixa}>
      <input {...props} type={visivel ? "text" : "password"} autoCapitalize="none" spellCheck={false} />
      <button
        type="button"
        className={estilos.mostrar}
        onClick={() => setVisivel((v) => !v)}
        aria-pressed={visivel}
        aria-label={visivel ? "Esconder a senha" : "Mostrar a senha"}
      >
        {visivel ? "Esconder" : "Mostrar"}
      </button>
    </span>
  );
}
