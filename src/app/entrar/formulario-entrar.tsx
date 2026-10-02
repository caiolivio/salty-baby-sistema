"use client";

import { CampoSenha } from "@/componentes/campo-senha";
import { useActionState } from "react";
import estilos from "@/componentes/formulario.module.css";
import { entrar } from "./acoes";

export function FormularioEntrar({ voltar }: { voltar?: string }) {
  const [estado, acao, enviando] = useActionState(entrar, undefined);

  return (
    <form action={acao} className={estilos.formulario}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <label className={estilos.campo}>
        E-mail
        <input name="email" type="email" autoComplete="email" required defaultValue={estado?.email} />
      </label>
      <label className={estilos.campo}>
        Senha
        <CampoSenha name="senha" autoComplete="current-password" required />
      </label>
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <button className={estilos.botao} type="submit" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
