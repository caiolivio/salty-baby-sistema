"use client";

import { useActionState } from "react";
import { DESTINOS, FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import estilos from "../../formulario.module.css";
import { CamposDeDesconto, type PecaDoDesconto } from "../../vendas/campos-de-desconto";
import { confirmar } from "../acoes";

export function ConfirmarPagamento({ id, pecas, mostrarValores }: { id: string; pecas: PecaDoDesconto[]; mostrarValores: boolean }) {
  const [estado, acao, enviando] = useActionState(confirmar, undefined);
  const v = estado?.valores ?? {};
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
            <select name="forma" defaultValue={v.forma ?? ""} required>
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
        </div>
        <div className={estilos.opcoes}>
          {DESTINOS.map((d, i) => (
            <label key={d.valor} className={estilos.marcar}>
              <input type="radio" name="destino" value={d.valor} defaultChecked={v.destino ? v.destino === d.valor : i === 0} /> {d.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <CamposDeDesconto pecas={pecas} valores={v} mostrarValores={mostrarValores} />
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Confirmando…" : "Confirmar pagamento"}
        </button>
      </div>
    </form>
  );
}
