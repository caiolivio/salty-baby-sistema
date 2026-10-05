"use client";

import { useActionState } from "react";
import { CATEGORIAS_DESPESA } from "@/lib/financeiro/regras";
import proprios from "../../formulario.module.css";
import { novaDespesa } from "../acoes";
import estilos from "../financeiro.module.css";

/** Lançar uma despesa. Depois de salvar, o formulário volta vazio (com a mesma data e categoria). */
export function FormularioDespesa({ hoje }: { hoje: string }) {
  const [estado, acao, enviando] = useActionState(novaDespesa, undefined);
  // Depois de salvar, os campos voltam vazios (o React limpa o formulário da ação),
  // só a data e a categoria continuam, para lançar várias despesas seguidas.
  const v = estado?.valores ?? {};
  return (
    <form action={acao} className={estilos.formDespesa}>
      {estado?.erro && (
        <p className={`${proprios.erro} ${estilos.largo}`} role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p className={`${proprios.aviso} ${estilos.largo}`} role="status">
          Despesa lançada.
        </p>
      )}
      <label className={`${proprios.campo} ${estilos.largo}`}>
        O que foi
        <input
          name="descricao"
          defaultValue={v.descricao ?? ""}
          maxLength={160}
          required
          placeholder="Ex.: sacolas kraft, aluguel de outubro"
        />
      </label>
      <label className={proprios.campo}>
        Categoria
        <select name="categoria" defaultValue={v.categoria ?? ""} required>
          <option value="" disabled>
            Escolha
          </option>
          {CATEGORIAS_DESPESA.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className={proprios.campo}>
        Valor (R$)
        <input name="valor" defaultValue={v.valor ?? ""} inputMode="decimal" required placeholder="0,00" />
      </label>
      <label className={proprios.campo}>
        Data
        <input type="date" name="data" defaultValue={v.data || hoje} max={hoje} required />
      </label>
      <button type="submit" className={proprios.botao} disabled={enviando}>
        {enviando ? "Salvando…" : "Lançar despesa"}
      </button>
    </form>
  );
}
