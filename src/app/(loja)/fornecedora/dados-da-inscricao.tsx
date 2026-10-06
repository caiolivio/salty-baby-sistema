"use client";

import { useActionState } from "react";
import estilos from "../loja.module.css";
import { salvarDadosDaInscricao } from "./acoes";

type Dados = { nome: string; email: string; telefone: string; endereco: string; cep: string; cidade: string; estado: string };

/** Passo 2: a candidata corrige os dados que mandou na inscrição. */
export function DadosDaInscricao({ iniciais }: { iniciais: Dados }) {
  const [estado, acao, enviando] = useActionState(salvarDadosDaInscricao, undefined);
  const v = (campo: keyof Dados) => estado?.valores?.[campo] ?? iniciais[campo];
  return (
    <details className={estilos.secao} open={Boolean(estado)}>
      <summary>Seus dados</summary>
      <form action={acao} className={`${estilos.formConta} ${estilos.formLargo}`} key={JSON.stringify(estado ?? null)}>
        {estado?.ok && (
          <p className={estilos.sucesso} role="status">
            {estado.ok}
          </p>
        )}
        <label>
          Nome completo
          <input name="nome" autoComplete="name" required maxLength={160} defaultValue={v("nome")} />
        </label>
        <label>
          E-mail (para entrar)
          <input name="email" type="email" autoComplete="email" required maxLength={191} defaultValue={v("email")} />
        </label>
        <label>
          WhatsApp (com DDD)
          <input name="telefone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} defaultValue={v("telefone")} />
        </label>
        <label>
          Endereço (rua, número e bairro)
          <input name="endereco" autoComplete="street-address" required maxLength={255} defaultValue={v("endereco")} />
        </label>
        <div className={estilos.linhaCampos}>
          <label>
            CEP
            <input name="cep" inputMode="numeric" autoComplete="postal-code" maxLength={15} defaultValue={v("cep")} />
          </label>
          <label>
            Cidade
            <input name="cidade" autoComplete="address-level2" maxLength={100} defaultValue={v("cidade")} />
          </label>
          <label>
            Estado
            <input name="estado" autoComplete="address-level1" maxLength={60} defaultValue={v("estado")} />
          </label>
        </div>
        {estado?.erro && (
          <p className={estilos.avisoPerto} role="alert">
            {estado.erro}
          </p>
        )}
        <button type="submit" className={estilos.botaoWhats} disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar meus dados"}
        </button>
      </form>
    </details>
  );
}
