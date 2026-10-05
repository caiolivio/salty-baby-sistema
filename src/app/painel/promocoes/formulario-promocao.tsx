"use client";

import { useActionState, useState } from "react";
import estilos from "../formulario.module.css";
import { gravarPromocao } from "./acoes";

/** Formulário da promoção: nome, desconto, período, quem paga e (na nova) as peças. */
export function FormularioPromocao({ iniciais, hoje }: { iniciais?: Record<string, string>; hoje: string }) {
  const [estado, acao, enviando] = useActionState(gravarPromocao, undefined);
  const v = estado?.valores ?? iniciais ?? {};
  const [tipo, setTipo] = useState(v.tipo || "percentual");
  const nova = !v.id;
  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <fieldset className={estilos.grupo}>
        <legend>Promoção</legend>
        <label className={estilos.campo}>
          Nome
          <input name="nome" defaultValue={v.nome} maxLength={80} required placeholder="Ex.: Liquida de inverno" />
        </label>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Desconto em
            <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="percentual">% do preço</option>
              <option value="reais">R$ (valor fixo)</option>
            </select>
          </label>
          <label className={estilos.campo}>
            {tipo === "reais" ? "Desconto (R$)" : "Desconto (%)"}
            <input name="valor" defaultValue={v.valor} inputMode="decimal" required placeholder={tipo === "reais" ? "10,00" : "20"} />
          </label>
          <label className={estilos.campo}>
            Começa em
            <input type="date" name="inicio" defaultValue={v.inicio || hoje} required />
          </label>
          <label className={estilos.campo}>
            Termina em
            <input type="date" name="fim" defaultValue={v.fim} min={hoje} required />
          </label>
        </div>
        <fieldset className={estilos.opcoes}>
          <legend>Quem paga o desconto das peças consignadas</legend>
          <label className={estilos.marcar}>
            <input type="radio" name="quem" value="dividido" defaultChecked={v.quem !== "loja"} /> Dividido com a fornecedora (o repasse é
            calculado sobre o preço com desconto)
          </label>
          <label className={estilos.marcar}>
            <input type="radio" name="quem" value="loja" defaultChecked={v.quem === "loja"} /> Por conta da loja (a fornecedora recebe o
            repasse do preço cheio)
          </label>
        </fieldset>
        {!nova && (
          <label className={estilos.marcar}>
            <input type="checkbox" name="ativa" defaultChecked={v.ativa !== ""} /> Promoção ativa (desmarque para pausar)
          </label>
        )}
        {nova && (
          <label className={estilos.campo}>
            Códigos das peças
            <textarea name="codigos" defaultValue={v.codigos} rows={4} placeholder="F06-00001, F12-00003, SB-00010…" />
            <span className={estilos.dica}>
              Cole os códigos separados por vírgula, espaço ou um por linha. Dá para incluir mais depois.
            </span>
          </label>
        )}
      </fieldset>
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Salvando…" : nova ? "Criar promoção" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
