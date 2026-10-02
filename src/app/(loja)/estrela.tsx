"use client";

import { useOptimistic, useTransition } from "react";
import { favoritar } from "./minha-conta/acoes";
import estilos from "./loja.module.css";

/**
 * Estrela de favorito da peça. Muda na hora ao tocar; quem não entrou na conta
 * vai para a página de entrar e depois volta para cá.
 */
export function Estrela({
  pecaId,
  favorita,
  voltar,
  nome,
  grande = false,
}: {
  pecaId: string;
  favorita: boolean;
  voltar: string;
  nome: string;
  grande?: boolean;
}) {
  const [marcada, marcar] = useOptimistic(favorita, (_atual, nova: boolean) => nova);
  const [, iniciar] = useTransition();

  return (
    <form
      action={(dados) =>
        iniciar(async () => {
          marcar(!marcada);
          await favoritar(dados);
        })
      }
      className={grande ? estilos.estrelaGrande : estilos.estrela}
    >
      <input type="hidden" name="pecaId" value={pecaId} />
      <input type="hidden" name="voltar" value={voltar} />
      <button
        type="submit"
        aria-pressed={marcada}
        aria-label={marcada ? `Tirar ${nome} dos favoritos` : `Guardar ${nome} nos favoritos`}
        title={marcada ? "Tirar dos favoritos" : "Guardar nos favoritos"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
        </svg>
        {grande && <span>{marcada ? "Nos favoritos" : "Favoritar"}</span>}
      </button>
    </form>
  );
}
