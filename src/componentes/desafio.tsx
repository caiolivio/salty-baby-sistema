"use client";

import { useState, useTransition } from "react";
import { trocarDesafio } from "./desafio-acao";
import estilos from "./desafio.module.css";

/**
 * "Digite as letras da imagem", contra robôs. Leva também um campo escondido
 * que pessoas não veem: se vier preenchido, quem enviou foi um robô.
 */
export function Desafio({ inicial }: { inicial: { imagem: string; ficha: string } }) {
  const [desafio, setDesafio] = useState(inicial);
  const [trocando, iniciar] = useTransition();

  return (
    <div className={estilos.desafio}>
      <span className={estilos.rotulo} id="desafio-rotulo">
        Para provar que você não é um robô, digite as letras e números da imagem
      </span>
      <div className={estilos.linha}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada na hora */}
        <img src={desafio.imagem} alt="Imagem com letras e números para digitar" width={220} height={80} />
        <button
          type="button"
          className={estilos.trocar}
          disabled={trocando}
          onClick={() => iniciar(async () => setDesafio(await trocarDesafio()))}
        >
          {trocando ? "Trocando…" : "Trocar imagem"}
        </button>
      </div>
      <input
        name="desafio_resposta"
        aria-labelledby="desafio-rotulo"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        maxLength={10}
        className={estilos.resposta}
      />
      <input type="hidden" name="desafio_ficha" value={desafio.ficha} />
      {/* Armadilha para robôs: fica fora da tela e ninguém preenche. */}
      <label className={estilos.armadilha} aria-hidden="true">
        Não preencha este campo
        <input name="empresa_site" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
