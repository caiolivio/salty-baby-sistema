"use client";

import Link from "next/link";
import { useActionState } from "react";
import estilos from "../formulario.module.css";
import proprios from "./equipe.module.css";
import type { EstadoSuporte } from "./acoes";
import { LinkGerado } from "./link-gerado";

type Acao = (estado: EstadoSuporte, dados: FormData) => Promise<EstadoSuporte>;

/** Cadastro (ou dados) de outra administradora: ela tem todos os poderes, então não há lista de páginas. */
export function FormularioAdministradora({
  acao,
  iniciais,
  textoBotao,
}: {
  acao: Acao;
  iniciais: { id?: string; nome?: string; email?: string; whatsapp?: string };
  textoBotao: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, undefined);
  const editando = Boolean(iniciais.id);

  if (estado?.criado) {
    const c = estado.criado;
    return (
      <div className={estilos.formulario}>
        <p className={estilos.aviso} role="status">
          {c.nome} agora é administradora.{" "}
          {c.link
            ? "Mande o link abaixo para a pessoa criar a senha. Ele vale por 7 dias, funciona uma vez só e não aparece de novo depois que você sair desta página."
            : "Esse e-mail já tinha conta no site: a pessoa entra no painel com a senha que já usa."}
        </p>
        {c.link && <LinkGerado link={c.link} whatsapp={c.whatsapp} />}
        <p>
          <Link href={`/painel/equipe/${c.id}`}>Ver o cadastro</Link> · <Link href="/painel/equipe">Voltar para a equipe</Link>
        </p>
      </div>
    );
  }

  const valores = estado?.valores;
  const texto = (campo: "nome" | "email" | "whatsapp") => (valores ? valores[campo] : iniciais[campo]) ?? "";

  return (
    <form action={enviar} className={estilos.formulario} key={JSON.stringify(valores ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {editando && <input type="hidden" name="id" value={iniciais.id} />}
      <fieldset className={estilos.grupo}>
        <legend>Dados</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Nome
            <input name="nome" required minLength={2} maxLength={120} defaultValue={texto("nome")} autoComplete="off" />
          </label>
          <label className={estilos.campo}>
            E-mail
            <input
              name="email"
              type="email"
              required={!editando}
              disabled={editando}
              maxLength={191}
              defaultValue={texto("email")}
              autoComplete="off"
            />
            <span className={estilos.dica}>
              {editando ? "É o login da pessoa e não muda." : "É com ele que a pessoa entra no painel."}
            </span>
          </label>
          <label className={estilos.campo}>
            WhatsApp
            <input name="whatsapp" type="tel" maxLength={40} defaultValue={texto("whatsapp")} placeholder="(12) 99999-9999" />
            <span className={estilos.dica}>Para mandar o link de senha. Opcional.</span>
          </label>
        </div>
      </fieldset>
      {!editando && (
        <>
          <p className={proprios.alerta} role="note">
            A administradora pode tudo o que você pode: ver custos, repasses e lucro, confirmar pagamentos, pagar
            fornecedoras, excluir peças, mudar as Configurações, a Equipe (inclusive cadastrar ou tirar outras
            administradoras) e ver CPF, CNPJ e Pix. Cadastre só alguém de total confiança. Tudo o que ela faz fica no
            Histórico.
          </p>
          <label className={proprios.risco}>
            <input type="checkbox" name="confirmo" value="sim" required defaultChecked={valores?.confirmo === "sim"} />
            <span>
              <strong>Entendo que esta pessoa terá todos os poderes do painel.</strong>
            </span>
          </label>
        </>
      )}
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Salvando…" : textoBotao}
        </button>
        <Link href="/painel/equipe" className={estilos.botaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
