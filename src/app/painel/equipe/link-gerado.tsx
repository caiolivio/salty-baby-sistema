"use client";

import { useState } from "react";
import estilos from "../formulario.module.css";

/** Link de senha recém-criado, com "Enviar no WhatsApp" e "Copiar link". */
export function LinkGerado({ link, whatsapp }: { link: string; whatsapp?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <>
      <code className={estilos.linkGerado}>{link}</code>
      <div className={estilos.acoes}>
        {whatsapp && (
          <a className={estilos.botao} href={whatsapp} target="_blank" rel="noopener noreferrer">
            Enviar no WhatsApp
          </a>
        )}
        <button
          type="button"
          className={whatsapp ? estilos.botaoSecundario : estilos.botao}
          onClick={() => navigator.clipboard?.writeText(link).then(() => setCopiado(true), () => {})}
        >
          {copiado ? "Link copiado" : "Copiar link"}
        </button>
      </div>
    </>
  );
}
