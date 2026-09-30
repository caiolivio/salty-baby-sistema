"use client";

import { useActionState } from "react";
import estilos from "../loja.module.css";
import { fechar } from "./acoes";

export function FecharPedido() {
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
        <input name="nome" defaultValue={estado?.nome} autoComplete="name" maxLength={120} required />
      </label>
      <label>
        Seu WhatsApp (com DDD)
        <input name="telefone" type="tel" defaultValue={estado?.telefone} autoComplete="tel" inputMode="tel" maxLength={20} required />
      </label>
      <button type="submit" className={estilos.botaoWhats} disabled={enviando}>
        {enviando ? "Reservando…" : "Fechar pedido e enviar no WhatsApp"}
      </button>
      <span className={estilos.dica}>
        As peças ficam reservadas para você por 15 minutos, enquanto combina o pagamento com a loja.
      </span>
    </form>
  );
}
