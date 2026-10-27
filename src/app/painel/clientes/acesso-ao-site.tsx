"use client";

import { useActionState } from "react";
import { EnvioDoLink } from "../envio-do-link";
import estilos from "../formulario.module.css";
import { liberarAcesso } from "./acoes";

/** Cria o acesso da cliente ao site, ou um link de nova senha, e manda pelo WhatsApp. */
export function AcessoAoSite({ clienteId, email, temConta }: { clienteId: string; email: string; temConta: boolean }) {
  const [estado, acao, enviando] = useActionState(liberarAcesso, undefined);

  if (estado?.link) {
    return (
      <div className={estilos.formulario}>
        <p className={estilos.aviso} role="status">
          {estado.novaConta ? "Acesso criado." : "Link novo criado."} Mande o link para a cliente criar a senha. Ele vale por 7
          dias e funciona uma vez só, e não aparece de novo depois que você sair desta página.
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
      <input type="hidden" name="id" value={clienteId} />
      {temConta ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <label className={estilos.campo}>
          E-mail para entrar no site
          <input name="email" type="email" defaultValue={email} required maxLength={191} />
        </label>
      )}
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Criando…" : temConta ? "Gerar link de nova senha" : "Criar acesso ao site"}
        </button>
      </div>
      <p className={estilos.dica}>
        {temConta
          ? "Use quando a cliente esquecer a senha: ela recebe um link para criar outra."
          : "A cliente recebe um link para criar a própria senha. Você não precisa saber a senha dela."}
      </p>
    </form>
  );
}
