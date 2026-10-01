"use client";

import { useActionState, useState } from "react";
import estilos from "../formulario.module.css";
import { aprovar } from "./acoes";

/** Aprova o passo 1 (ou gera um link novo) e mostra o link para mandar no WhatsApp. */
export function Aprovar({ id, jaAprovada }: { id: string; jaAprovada: boolean }) {
  const [estado, acao, enviando] = useActionState(aprovar, undefined);
  const [copiado, setCopiado] = useState(false);

  if (estado?.link) {
    return (
      <div className={estilos.formulario}>
        <p className={estilos.aviso} role="status">
          {jaAprovada ? "Link novo criado." : "Inscrição aprovada."} Mande o link para ela criar a senha e fazer o passo 2.
          Ele vale por 7 dias e funciona uma vez só, e não aparece de novo depois que você sair desta página.
        </p>
        <code className={estilos.linkGerado}>{estado.link}</code>
        <div className={estilos.acoes}>
          {estado.whatsapp && (
            <a className={estilos.botao} href={estado.whatsapp} target="_blank" rel="noopener noreferrer">
              Enviar no WhatsApp dela
            </a>
          )}
          <button
            type="button"
            className={estado.whatsapp ? estilos.botaoSecundario : estilos.botao}
            onClick={() => navigator.clipboard?.writeText(estado.link!).then(() => setCopiado(true), () => {})}
          >
            {copiado ? "Link copiado" : "Copiar link"}
          </button>
        </div>
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
