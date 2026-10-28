"use client";

import { useActionState } from "react";
import { EnvioDoLink } from "../envio-do-link";
import estilos from "../formulario.module.css";
import { aprovar } from "./acoes";

/** Aprova o passo 1 (ou gera um link novo) e mostra o link para mandar no WhatsApp. */
export function Aprovar({ id, jaAprovada }: { id: string; jaAprovada: boolean }) {
  const [estado, acao, enviando] = useActionState(aprovar, undefined);

  if (estado?.link) {
    return (
      <div className={estilos.formulario}>
        <p className={estilos.aviso} role="status">
          {jaAprovada ? "Link novo criado." : "Inscrição aprovada."} Mande o link para ela criar a senha e fazer o passo 2.
          Ele vale por 7 dias e funciona uma vez só, e não aparece de novo depois que você sair desta página.
        </p>
        <code className={estilos.linkGerado}>{estado.link}</code>
        <EnvioDoLink link={estado.link} texto={estado.texto ?? estado.link} whatsapp={estado.whatsapp} />
      </div>
    );
  }

  return (
    <form action={acao} className={estilos.acoes}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={jaAprovada ? estilos.botaoSecundario : estilos.botao} disabled={enviando}>
        {enviando ? "Gerando…" : jaAprovada ? "Gerar link novo de acesso" : "Aprovar e gerar link de acesso"}
      </button>
    </form>
  );
}
