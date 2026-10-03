"use client";

import { useState } from "react";
import estilos from "../../formulario.module.css";

/** "Enviar no WhatsApp" (com o texto pronto) e "Copiar texto". */
export function EnviarComprovante({ texto, telefone }: { texto: string; telefone?: string }) {
  const [copiado, setCopiado] = useState(false);
  const link = `https://wa.me/${telefone ? `55${telefone}` : ""}?text=${encodeURIComponent(texto)}`;
  return (
    <div className={estilos.acoes}>
      <a className={estilos.botao} href={link} target="_blank" rel="noopener noreferrer">
        Enviar no WhatsApp
      </a>
      <button
        type="button"
        className={estilos.botaoSecundario}
        onClick={() => navigator.clipboard?.writeText(texto).then(() => setCopiado(true), () => {})}
      >
        {copiado ? "Texto copiado" : "Copiar texto"}
      </button>
    </div>
  );
}
