"use client";

import { useActionState } from "react";
import estilos from "../formulario.module.css";
import { gerarLinkDoSuporte } from "./acoes";
import { LinkGerado } from "./link-gerado";

export function LinkDeSenha({ id }: { id: string }) {
  const [estado, acao, enviando] = useActionState(gerarLinkDoSuporte, undefined);
  if (estado?.link) {
    return (
      <div className={estilos.formulario}>
        <p className={estilos.aviso} role="status">
          Link de nova senha criado. Ele vale por 7 dias, funciona uma vez só e não aparece de novo depois que você sair
          desta página.
        </p>
        <LinkGerado link={estado.link} whatsapp={estado.whatsapp} />
      </div>
    );
  }
  return (
    <form action={acao} className={estilos.formulario}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <input type="hidden" name="id" value={id} />
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botaoSecundario} disabled={enviando}>
          {enviando ? "Gerando…" : "Gerar link de nova senha"}
        </button>
      </div>
      <p className={estilos.dica}>Use quando a pessoa esquecer a senha ou ainda não tiver criado.</p>
    </form>
  );
}
