"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import estilos from "../../../formulario.module.css";
import { marcarEnviado } from "../../acoes";

/** "Enviar no WhatsApp" (com o texto pronto, e marca como enviado) e "Copiar texto". */
export function EnviarRelatorio({
  texto,
  telefone,
  fornecedoraId,
  mes,
}: {
  texto: string;
  telefone?: string;
  fornecedoraId: string;
  mes: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [, iniciar] = useTransition();
  const link = `https://wa.me/${telefone ? `55${telefone}` : ""}?text=${encodeURIComponent(texto)}`;
  const marcar = () => iniciar(() => marcarEnviado(fornecedoraId, mes));
  return (
    <div className={estilos.acoes}>
      <a className={estilos.botao} href={link} target="_blank" rel="noopener noreferrer" onClick={marcar}>
        <MessageCircle className="icone" aria-hidden />
        Enviar no WhatsApp
      </a>
      <button
        type="button"
        className={estilos.botaoSecundario}
        onClick={() =>
          navigator.clipboard?.writeText(texto).then(
            () => {
              setCopiado(true);
              marcar();
            },
            () => {},
          )
        }
      >
        {copiado ? "Texto copiado" : "Copiar texto"}
      </button>
    </div>
  );
}
