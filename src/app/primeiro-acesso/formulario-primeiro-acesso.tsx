"use client";

import { useActionState } from "react";
import estilos from "@/componentes/formulario.module.css";
import { SENHA_MINIMO } from "@/lib/senha";
import { criarAdministradora } from "./acoes";

export function FormularioPrimeiroAcesso() {
  const [estado, acao, enviando] = useActionState(criarAdministradora, undefined);

  return (
    <form action={acao} className={estilos.formulario}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <label className={estilos.campo}>
        Código de primeiro acesso
        <input name="codigo" type="password" autoComplete="off" required />
      </label>
      <label className={estilos.campo}>
        Seu nome
        <input name="nome" autoComplete="name" required defaultValue={estado?.nome} />
      </label>
      <label className={estilos.campo}>
        E-mail
        <input name="email" type="email" autoComplete="email" required defaultValue={estado?.email} />
      </label>
      <label className={estilos.campo}>
        Senha
        <input name="senha" type="password" autoComplete="new-password" minLength={SENHA_MINIMO} required />
        <span className={estilos.dica}>Pelo menos {SENHA_MINIMO} caracteres, com letras e números.</span>
      </label>
      <label className={estilos.campo}>
        Repita a senha
        <input name="confirmacao" type="password" autoComplete="new-password" required />
      </label>
      <button className={estilos.botao} type="submit" disabled={enviando}>
        {enviando ? "Criando…" : "Criar administradora e entrar"}
      </button>
    </form>
  );
}
