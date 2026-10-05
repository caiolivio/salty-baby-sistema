"use client";

import { useActionState } from "react";
import proprios from "../../formulario.module.css";
import { fechar, trocarPrazo, type EstadoSacolinha } from "../acoes";
import estilos from "../sacolinhas.module.css";

function Mensagem({ estado }: { estado: EstadoSacolinha }) {
  if (estado?.erro) return <p className={proprios.erro} role="alert">{estado.erro}</p>;
  if (estado?.ok) return <p className={proprios.aviso} role="status">{estado.ok}</p>;
  return null;
}

/** "Enviada" (com o frete pago pela cliente) ou "Retirada na loja". */
export function FecharSacolinha({ id, como }: { id: string; como: "enviada" | "retirada" }) {
  const [estado, acao, enviando] = useActionState(fechar, undefined);
  return (
    <form action={acao} className={estilos.form}>
      <Mensagem estado={estado} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="como" value={como} />
      {como === "enviada" && (
        <label className={proprios.campo}>
          Frete pago pela cliente (R$)
          <input name="frete" inputMode="decimal" placeholder="Opcional, por exemplo 18,50" />
        </label>
      )}
      <label className={proprios.campo}>
        Observação
        <input name="observacao" maxLength={255} placeholder={como === "enviada" ? "Opcional, por exemplo o código de rastreio" : "Opcional"} />
      </label>
      <button type="submit" className={como === "enviada" ? proprios.botao : proprios.botaoSecundario} disabled={enviando}>
        {como === "enviada" ? "Marcar como enviada" : "A cliente retirou na loja"}
      </button>
    </form>
  );
}

/** Muda o último dia para pedir o envio. */
export function MudarPrazo({ id, prazo, hoje }: { id: string; prazo: string; hoje: string }) {
  const [estado, acao, enviando] = useActionState(trocarPrazo, undefined);
  return (
    <form action={acao} className={estilos.form}>
      <Mensagem estado={estado} />
      <input type="hidden" name="id" value={id} />
      <label className={proprios.campo}>
        Novo prazo
        <input name="prazo" type="date" min={hoje} required defaultValue={prazo} />
      </label>
      <button type="submit" className={proprios.botaoSecundario} disabled={enviando}>
        Mudar o prazo
      </button>
    </form>
  );
}
