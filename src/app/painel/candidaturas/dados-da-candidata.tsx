"use client";

import { useActionState } from "react";
import proprios from "../formulario.module.css";
import { salvarDadosDaCandidata } from "./acoes";

type Dados = { id: string; nome: string; email: string; telefone: string; endereco: string; cep: string; cidade: string; estado: string };

/** Corrige os dados da inscrição. Fica fechado até tocar em "Editar dados". */
export function DadosDaCandidata({ iniciais, mudaConta }: { iniciais: Dados; mudaConta: boolean }) {
  const [estado, acao, enviando] = useActionState(salvarDadosDaCandidata, undefined);
  const v = (campo: keyof Dados) => estado?.valores?.[campo] ?? iniciais[campo];
  return (
    <details open={Boolean(estado?.erro)}>
      <summary>Editar dados</summary>
      <form action={acao} className={proprios.formulario} key={JSON.stringify(estado?.valores ?? null)}>
        {estado?.erro && (
          <p className={proprios.erro} role="alert">
            {estado.erro}
          </p>
        )}
        <input type="hidden" name="id" value={iniciais.id} />
        <div className={proprios.grade}>
          <label className={proprios.campo}>
            Nome completo
            <input name="nome" required maxLength={160} defaultValue={v("nome")} />
          </label>
          <label className={proprios.campo}>
            E-mail
            <input name="email" type="email" required maxLength={191} defaultValue={v("email")} />
            {mudaConta && <span className={proprios.dica}>É também o e-mail com que ela entra no site.</span>}
          </label>
          <label className={proprios.campo}>
            WhatsApp
            <input name="telefone" type="tel" required maxLength={20} defaultValue={v("telefone")} />
          </label>
          <label className={proprios.campo}>
            Endereço
            <input name="endereco" required maxLength={255} defaultValue={v("endereco")} />
          </label>
          <label className={proprios.campo}>
            CEP
            <input name="cep" maxLength={15} defaultValue={v("cep")} />
          </label>
          <label className={proprios.campo}>
            Cidade
            <input name="cidade" maxLength={100} defaultValue={v("cidade")} />
          </label>
          <label className={proprios.campo}>
            Estado
            <input name="estado" maxLength={60} defaultValue={v("estado")} />
          </label>
        </div>
        {estado?.erro && <p className={proprios.erro}>{estado.erro}</p>}
        <div className={proprios.acoes}>
          <button type="submit" className={proprios.botao} disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar dados"}
          </button>
        </div>
      </form>
    </details>
  );
}
