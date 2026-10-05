"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import estilos from "../../formulario.module.css";
import { avisoMandado, filaAvisada } from "./acoes";

/**
 * "Enviar no WhatsApp" e "Copiar texto": os dois marcam as peças como avisadas
 * para a cliente (ou, com "entradaFila", o aviso da fila de espera como mandado).
 */
export function EnviarAvisoDeChegada({
  clienteId,
  pecaIds = [],
  entradaFila,
  texto,
  telefone,
}: {
  clienteId: string;
  pecaIds?: string[];
  entradaFila?: string;
  texto: string;
  telefone: string | null;
}) {
  const [copiado, setCopiado] = useState(false);
  const [, iniciar] = useTransition();
  const link = `https://wa.me/${telefone ? `55${telefone}` : ""}?text=${encodeURIComponent(texto)}`;
  const marcar = () => iniciar(() => (entradaFila ? filaAvisada(entradaFila) : avisoMandado(clienteId, pecaIds)));
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
