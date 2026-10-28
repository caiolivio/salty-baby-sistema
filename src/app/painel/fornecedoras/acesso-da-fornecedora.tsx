"use client";

import { useActionState } from "react";
import { EnvioDoLink } from "../envio-do-link";
import estilos from "../formulario.module.css";
import { gerarAcesso } from "./acoes";

/** Gera o link de primeiro acesso (ou de nova senha) para mandar no WhatsApp da fornecedora. */
export function AcessoDaFornecedora({ id, temConta }: { id: string; temConta: boolean }) {
  const [estado, acao, enviando] = useActionState(gerarAcesso, undefined);

  if (estado?.link) {
    return (
      <div className={estilos.formulario}>
        <p className={estilos.aviso} role="status">
          {estado.tipo === "convite"
            ? "Link de primeiro acesso criado. Com ele, ela termina o cadastro (nome, e-mail e endereço são obrigatórios), cria a senha e aceita o acordo."
            : "Link de nova senha criado."}{" "}
          Ele vale por 7 dias e funciona uma vez só, e não aparece de novo depois que você sair desta página.
        </p>
        <code className={estilos.linkGerado}>{estado.link}</code>
        <EnvioDoLink link={estado.link} texto={estado.texto ?? estado.link} whatsapp={estado.whatsapp} />
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
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Gerando…" : temConta ? "Gerar link de nova senha" : "Gerar link de primeiro acesso"}
        </button>
      </div>
      <p className={estilos.dica}>
        {temConta
          ? "Use quando ela esquecer a senha: ela recebe um link para criar outra."
          : "Ela ainda não entrou na área dela. O link leva direto para terminar o cadastro e criar a senha."}
      </p>
    </form>
  );
}
