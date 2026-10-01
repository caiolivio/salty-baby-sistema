"use client";

import { CampoSenha } from "@/componentes/campo-senha";
import { useActionState } from "react";
import estilos from "@/componentes/formulario.module.css";
import { criarSenha } from "./acoes";

export function FormularioCriarSenha({ codigo }: { codigo: string }) {
  const [estado, acao, enviando] = useActionState(criarSenha, undefined);
  return (
    <form action={acao} className={estilos.formulario}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <input type="hidden" name="codigo" value={codigo} />
      <label className={estilos.campo}>
        Nova senha
        <CampoSenha name="senha" autoComplete="new-password" required minLength={8} maxLength={72} />
        <span className={estilos.dica}>Pelo menos 8 caracteres, com letras e números.</span>
      </label>
      <label className={estilos.campo}>
        Repita a senha
        <CampoSenha name="confirmacao" autoComplete="new-password" required minLength={8} maxLength={72} />
      </label>
      <button className={estilos.botao} type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Criar senha e entrar"}
      </button>
    </form>
  );
}
