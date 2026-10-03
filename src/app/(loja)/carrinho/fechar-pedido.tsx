"use client";

import { useActionState } from "react";
import { formatarReais } from "@/lib/dinheiro";
import estilos from "../loja.module.css";
import { fechar } from "./acoes";

export function FecharPedido({
  nome,
  telefone,
  saldoCentavos,
  totalCentavos,
}: {
  nome?: string;
  telefone?: string;
  /** Saldo para compras, se quem está logada é uma fornecedora com saldo. */
  saldoCentavos?: number;
  totalCentavos?: number;
}) {
  const [estado, acao, enviando] = useActionState(fechar, undefined);
  return (
    <form action={acao} className={estilos.fechar} key={JSON.stringify(estado ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <label>
        Seu nome
        <input name="nome" defaultValue={estado?.nome ?? nome} autoComplete="name" maxLength={120} required />
      </label>
      <label>
        Seu WhatsApp (com DDD)
        <input name="telefone" type="tel" defaultValue={estado?.telefone ?? telefone} autoComplete="tel" inputMode="tel" maxLength={20} required />
      </label>
      {saldoCentavos ? (
        <label className={estilos.marcarLinha}>
          <input type="checkbox" name="usar_saldo" value="sim" defaultChecked />
          <span>
            Pagar com o meu saldo de fornecedora ({formatarReais(saldoCentavos)} disponível)
            {totalCentavos && totalCentavos > saldoCentavos
              ? `. O saldo cobre ${formatarReais(saldoCentavos)}, e o resto (${formatarReais(totalCentavos - saldoCentavos)}) você combina com a loja.`
              : "."}
          </span>
        </label>
      ) : null}
      <button type="submit" className={estilos.botaoWhats} disabled={enviando}>
        {enviando ? "Reservando…" : "Fechar pedido e enviar no WhatsApp"}
      </button>
      <span className={estilos.dica}>
        As peças ficam reservadas para você por 15 minutos, enquanto combina o pagamento com a loja.
      </span>
    </form>
  );
}
