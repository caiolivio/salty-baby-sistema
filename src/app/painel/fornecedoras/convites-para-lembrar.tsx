"use client";

import Link from "next/link";
import { useActionState } from "react";
import { EnvioDoLink } from "../envio-do-link";
import estilos from "../formulario.module.css";
import { lembrarFornecedora } from "./acoes";

export type ConviteParaLembrar = { id: string; codigo: string; nome: string; situacao: string; geraLinkNovo: boolean };

/** Uma fornecedora da lista "Convites para lembrar", com o botão que monta o lembrete. */
export function LembrarFornecedora({ f }: { f: ConviteParaLembrar }) {
  const [estado, acao, enviando] = useActionState(lembrarFornecedora, undefined);
  return (
    <li>
      <strong>
        <Link href={`/painel/fornecedoras/${f.id}`}>
          {f.codigo} · {f.nome}
        </Link>
      </strong>
      <br />
      <span className={estilos.dica}>{f.situacao}</span>
      {estado?.link ? (
        <>
          <p className={estilos.aviso} role="status">
            {f.geraLinkNovo ? "Link novo criado (o anterior deixou de valer)." : "Lembrete pronto, com o endereço de entrar."} Mande
            para ela:
          </p>
          <EnvioDoLink link={estado.link} texto={estado.texto ?? estado.link} whatsapp={estado.whatsapp} />
        </>
      ) : (
        <form action={acao}>
          {estado?.erro && (
            <p className={estilos.erro} role="alert">
              {estado.erro}
            </p>
          )}
          <input type="hidden" name="id" value={f.id} />
          <button type="submit" className={estilos.botaoSecundario} disabled={enviando}>
            {enviando ? "Preparando…" : "Reenviar com lembrete"}
          </button>
        </form>
      )}
    </li>
  );
}
