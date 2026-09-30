"use client";

import { useActionState } from "react";
import { DESTINOS, FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import estilos from "../../formulario.module.css";
import { confirmar } from "../acoes";

export function ConfirmarPagamento({ id }: { id: string }) {
  const [estado, acao, enviando] = useActionState(confirmar, undefined);
  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      <input type="hidden" name="id" value={id} />
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <fieldset className={estilos.grupo}>
        <legend>Confirmar pagamento</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Forma de pagamento
            <select name="forma" defaultValue={estado?.forma ?? ""} required>
              <option value="" disabled>
                Escolha…
              </option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            Desconto (R$)
            <input name="desconto" inputMode="decimal" placeholder="0,00" defaultValue={estado?.desconto} />
            <span className={estilos.dica}>Opcional. É dividido entre as peças, e o repasse é calculado depois do desconto.</span>
          </label>
        </div>
        <div className={estilos.opcoes}>
          {DESTINOS.map((d, i) => (
            <label key={d.valor} className={estilos.marcar}>
              <input type="radio" name="destino" value={d.valor} defaultChecked={estado?.destino ? estado.destino === d.valor : i === 0} /> {d.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Confirmando…" : "Confirmar pagamento"}
        </button>
      </div>
    </form>
  );
}
