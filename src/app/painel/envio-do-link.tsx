"use client";

import { useState } from "react";
import estilos from "./formulario.module.css";

/**
 * Link de acesso gerado (primeiro acesso, aprovação ou nova senha) com a mensagem
 * pronta que vai junto no WhatsApp. Sem WhatsApp no cadastro, o botão abre o
 * WhatsApp para escolher o contato.
 */
export function EnvioDoLink({ link, texto, whatsapp }: { link: string; texto: string; whatsapp?: string }) {
  const [copiado, setCopiado] = useState<"mensagem" | "link" | null>(null);
  const copiar = (valor: string, qual: "mensagem" | "link") =>
    navigator.clipboard?.writeText(valor).then(
      () => setCopiado(qual),
      () => {},
    );

  return (
    <>
      <div className={estilos.acoes}>
        <a
          className={estilos.botao}
          href={whatsapp ?? `https://wa.me/?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {whatsapp ? "Enviar no WhatsApp dela" : "Enviar no WhatsApp (escolher o contato)"}
        </a>
        <button type="button" className={estilos.botaoSecundario} onClick={() => copiar(texto, "mensagem")}>
          {copiado === "mensagem" ? "Mensagem copiada" : "Copiar mensagem"}
        </button>
        <button type="button" className={estilos.botaoSecundario} onClick={() => copiar(link, "link")}>
          {copiado === "link" ? "Link copiado" : "Copiar só o link"}
        </button>
      </div>
      <details className={estilos.mensagemPronta}>
        <summary>Ver a mensagem que vai junto</summary>
        <pre>{texto}</pre>
      </details>
    </>
  );
}
