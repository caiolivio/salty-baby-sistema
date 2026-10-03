"use client";

import { useState } from "react";
import { formatarReais } from "@/lib/dinheiro";
import estilos from "../formulario.module.css";

export type SaldoDaFornecedora = {
  id: string;
  rotulo: string;
  disponivelCentavos: number;
  aReceberCentavos: number;
  bonusCentavos: number;
};

const noCampo = (centavos: number) => `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, "0")}`;

/**
 * "Pagar com o saldo de uma fornecedora", na confirmação de pagamento e na
 * venda direta. O limite e o bônus são conferidos de novo ao gravar.
 */
export function CampoDoSaldo({
  fornecedoras,
  valores = {},
  padrao,
}: {
  fornecedoras: SaldoDaFornecedora[];
  valores?: Record<string, string>;
  /** Fornecedora que pediu, no site, para pagar com o saldo. */
  padrao?: string | null;
}) {
  const [id, setId] = useState(valores.credito_fornecedora ?? padrao ?? "");
  const [valor, setValor] = useState(valores.credito_valor ?? "");
  const escolhida = fornecedoras.find((f) => f.id === id);
  if (fornecedoras.length === 0) return null;
  return (
    <fieldset className={estilos.grupo}>
      <legend>Pagar com o saldo de uma fornecedora (opcional)</legend>
      <p className={estilos.dica}>
        Se o saldo pagar tudo, a forma de pagamento fica “Crédito da fornecedora”. Se pagar só uma parte, escolha acima como foi pago o
        resto. O valor usado é descontado do próximo pagamento de repasse dela.
      </p>
      <div className={estilos.grade}>
        <label className={estilos.campo}>
          Fornecedora
          <select
            name="credito_fornecedora"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              if (!e.target.value) setValor("");
            }}
          >
            <option value="">Não usar saldo</option>
            {fornecedoras.map((f) => (
              <option key={f.id} value={f.id}>
                {f.rotulo} · saldo {formatarReais(f.disponivelCentavos)}
              </option>
            ))}
          </select>
        </label>
        {escolhida && (
          <label className={estilos.campo}>
            Quanto sai do saldo (R$)
            <input name="credito_valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required />
          </label>
        )}
      </div>
      {escolhida && (
        <>
          <p className={estilos.dica}>
            Saldo disponível: <strong>{formatarReais(escolhida.disponivelCentavos)}</strong>
            {escolhida.bonusCentavos > 0 && ` (inclui ${formatarReais(escolhida.bonusCentavos)} de bônus, usado primeiro)`}.
            {escolhida.aReceberCentavos > 0 &&
              ` Se usar todo o saldo, ela ganha ${formatarReais(Math.round(escolhida.aReceberCentavos / 10))} de bônus para a próxima compra.`}
          </p>
          <div className={estilos.acoes}>
            <button type="button" className={estilos.botaoSecundario} onClick={() => setValor(noCampo(escolhida.disponivelCentavos))}>
              Usar todo o saldo
            </button>
          </div>
        </>
      )}
    </fieldset>
  );
}
