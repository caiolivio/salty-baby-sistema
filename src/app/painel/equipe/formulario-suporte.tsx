"use client";

import Link from "next/link";
import { useActionState } from "react";
import { EXTRAS, PAGINAS, type Acesso } from "@/lib/permissoes";
import estilos from "../formulario.module.css";
import proprios from "./equipe.module.css";
import type { EstadoSuporte } from "./acoes";
import { LinkGerado } from "./link-gerado";

type Acao = (estado: EstadoSuporte, dados: FormData) => Promise<EstadoSuporte>;

export function FormularioSuporte({
  acao,
  iniciais,
  textoBotao,
}: {
  acao: Acao;
  iniciais: { id?: string; nome?: string; email?: string; whatsapp?: string; acesso?: Acesso };
  textoBotao: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, undefined);
  const editando = Boolean(iniciais.id);

  if (estado?.criado) {
    const c = estado.criado;
    return (
      <div className={estilos.formulario}>
        <p className={estilos.aviso} role="status">
          {c.nome} entrou na equipe.{" "}
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
  const nivel = (chave: string) =>
    valores ? (valores[`pagina:${chave}`] ?? "") : (iniciais.acesso?.paginas[chave as keyof Acesso["paginas"]] ?? "");
  const extra = (chave: string) =>
    valores ? valores[`extra:${chave}`] === "sim" : Boolean(iniciais.acesso?.extras.some((e) => e === chave));

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

      <fieldset className={estilos.grupo}>
        <legend>Páginas que pode usar</legend>
        <p className={estilos.dica}>
          &quot;Só ver&quot; mostra a página sem deixar salvar nada. &quot;Ver e alterar&quot; deixa cadastrar e mudar.
          CPF/CNPJ, Pix, Equipe, Configurações e Importar do Notion são sempre só da administradora.
        </p>
        <div className={proprios.permissoes}>
          {PAGINAS.map((p) => (
            <div key={p.chave} className={proprios.linha} role="radiogroup" aria-label={p.nome}>
              <span>
                <strong>{p.nome}</strong>
                <span className={estilos.dica}>{p.explica}</span>
              </span>
              <span className={proprios.niveis}>
                {[
                  ["", "Sem acesso"],
                  ["ver", "Só ver"],
                  ["alterar", "Ver e alterar"],
                ].map(([valor, rotulo]) => (
                  <label key={valor} className={estilos.marcar}>
                    <input type="radio" name={`pagina:${p.chave}`} value={valor} defaultChecked={nivel(p.chave) === valor} />
                    {rotulo}
                  </label>
                ))}
              </span>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend>Acessos sensíveis (opcional)</legend>
        <p className={proprios.alerta} role="note">
          Libere só para alguém de muita confiança. Cada um destes acessos dá poder sobre dinheiro ou sobre dados que não
          voltam atrás. Tudo o que a pessoa faz fica no Histórico.
        </p>
        {EXTRAS.map((e) => (
          <label key={e.chave} className={proprios.risco}>
            <input type="checkbox" name={`extra:${e.chave}`} value="sim" defaultChecked={extra(e.chave)} />
            <span>
              <strong>{e.nome}</strong>
              <span className={estilos.dica}>Risco: {e.risco}</span>
            </span>
          </label>
        ))}
      </fieldset>

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
