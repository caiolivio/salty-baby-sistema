"use client";

import { useActionState } from "react";
import { CampoSenha } from "@/componentes/campo-senha";
import estilos from "../loja.module.css";
import { mudarSenha, salvarDados } from "./acoes";
import { CamposDaFornecedora, type ValoresDados } from "./campos-dados";

export function FormularioDados({ iniciais, textoBotao }: { iniciais: ValoresDados; textoBotao: string }) {
  const [estado, acao, enviando] = useActionState(salvarDados, undefined);
  return (
    <form action={acao} className={`${estilos.formConta} ${estilos.formLargo}`} key={JSON.stringify(estado ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p className={estilos.sucesso} role="status">
          {estado.ok}
        </p>
      )}
      <CamposDaFornecedora valores={estado?.valores ?? iniciais} />
      <button type="submit" className={estilos.botaoWhats} disabled={enviando}>
        {enviando ? "Salvando…" : textoBotao}
      </button>
    </form>
  );
}

export function FormularioSenha() {
  const [estado, acao, enviando] = useActionState(mudarSenha, undefined);
  return (
    <form action={acao} className={estilos.formConta} key={JSON.stringify(estado ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p className={estilos.sucesso} role="status">
          {estado.ok}
        </p>
      )}
      <label>
        Senha atual
        <CampoSenha name="atual" autoComplete="current-password" required maxLength={72} />
      </label>
      <label>
        Nova senha
        <CampoSenha name="senha" autoComplete="new-password" required minLength={8} maxLength={72} />
      </label>
      <label>
        Repita a nova senha
        <CampoSenha name="confirmacao" autoComplete="new-password" required minLength={8} maxLength={72} />
      </label>
      <button type="submit" className={estilos.botaoContorno} disabled={enviando}>
        {enviando ? "Trocando…" : "Trocar senha"}
      </button>
    </form>
  );
}
