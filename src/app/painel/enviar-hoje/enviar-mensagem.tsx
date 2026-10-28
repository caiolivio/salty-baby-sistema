"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import type { TipoDeMensagem } from "@/lib/hoje/regras";
import estilos from "../formulario.module.css";
import { mensagemMandada } from "./acoes";

/**
 * "Enviar no WhatsApp" (no número da pessoa, ou escolhendo o contato) e "Copiar
 * texto". Os dois tiram a mensagem da lista; a mensagem fica para conferir antes.
 */
export function EnviarMensagem({
  tipo,
  referencia,
  texto,
  telefone,
}: {
  tipo: TipoDeMensagem;
  referencia: string;
  texto: string;
  telefone: string | null;
}) {
  const [copiado, setCopiado] = useState(false);
  const [, iniciar] = useTransition();
  const link = `https://wa.me/${telefone ? `55${telefone}` : ""}?text=${encodeURIComponent(texto)}`;
  const marcar = () => iniciar(() => mensagemMandada(tipo, referencia));
  return (
    <>
      <details className={estilos.mensagemPronta}>
        <summary>Ver a mensagem</summary>
        <pre>{texto}</pre>
      </details>
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
    </>
  );
}
