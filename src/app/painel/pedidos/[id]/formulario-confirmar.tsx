"use client";

import { useActionState } from "react";
import { DESTINOS, FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import estilos from "../../formulario.module.css";
import { CampoDoSaldo, type SaldoDaFornecedora } from "../../vendas/campo-do-saldo";
import { CamposDeDesconto, type PecaDoDesconto } from "../../vendas/campos-de-desconto";
import { confirmar } from "../acoes";

export function ConfirmarPagamento({
  id,
  pecas,
  mostrarValores,
  saldos,
  saldoPedido,
  iniciais,
}: {
  id: string;
  pecas: PecaDoDesconto[];
  mostrarValores: boolean;
  saldos: SaldoDaFornecedora[];
  saldoPedido: string | null;
  /** Campos já preenchidos (o desconto das promoções). */
  iniciais?: Record<string, string>;
}) {
  const [estado, acao, enviando] = useActionState(confirmar, undefined);
  const v = estado?.valores ?? iniciais ?? {};
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
        <p className={estilos.dica}>
          Na sacolinha, as peças ficam guardadas na loja até a cliente pedir o envio (ela paga o frete). Precisa de uma
          cliente na venda. Depois do prazo da sacolinha, as peças são doadas.
        </p>
      </fieldset>
      <CamposDeDesconto pecas={pecas} valores={v} mostrarValores={mostrarValores} />
      <CampoDoSaldo fornecedoras={saldos} valores={v} padrao={saldoPedido} />
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Confirmando…" : "Confirmar pagamento"}
        </button>
      </div>
    </form>
  );
}
