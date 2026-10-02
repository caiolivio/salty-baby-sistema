"use client";

import { useActionState } from "react";
import { CampoSenha } from "@/componentes/campo-senha";
import estilos from "../../loja.module.css";
import { CamposDaFornecedora, type ValoresDados } from "../../fornecedora/campos-dados";
import { terminarCadastro } from "./acoes";

export function FormularioConvite({ codigo, iniciais }: { codigo: string; iniciais: ValoresDados }) {
  const [estado, acao, enviando] = useActionState(terminarCadastro, undefined);
  return (
    <form action={acao} className={`${estilos.formConta} ${estilos.formLargo}`} key={JSON.stringify(estado ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <input type="hidden" name="codigo" value={codigo} />
      <CamposDaFornecedora valores={estado?.valores ?? iniciais} />
      <label>
        Crie sua senha *
        <CampoSenha name="senha" autoComplete="new-password" required minLength={8} maxLength={72} />
        <span className={estilos.dica}>Pelo menos 8 caracteres, com letras e números.</span>
      </label>
      <label>
        Repita a senha *
        <CampoSenha name="confirmacao" autoComplete="new-password" required minLength={8} maxLength={72} />
      </label>
      <button type="submit" className={estilos.botaoWhats} disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar e continuar"}
      </button>
    </form>
  );
}
