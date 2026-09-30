"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoFornecedora } from "./acoes";
import estilos from "../formulario.module.css";

type Acao = (estado: EstadoFornecedora, dados: FormData) => Promise<EstadoFornecedora>;

export type ValoresFornecedora = Partial<
  Record<
    "id" | "nome" | "telefone" | "email" | "documento" | "pix" | "endereco" | "cep" | "cidade" | "estado" | "percentualRepassePadrao",
    string
  >
> & { ativa?: boolean };

export function FormularioFornecedora({
  acao,
  iniciais,
  textoBotao,
  voltar,
}: {
  acao: Acao;
  iniciais: ValoresFornecedora;
  textoBotao: string;
  voltar: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, undefined);
  // Depois de um erro, o formulário volta com o que a pessoa digitou.
  const v = (campo: keyof ValoresFornecedora) => (estado?.valores ? estado.valores[campo] : iniciais[campo]) as string | undefined;
  const editando = Boolean(iniciais.id);
  const ativa = estado?.valores ? estado.valores.ativa === "sim" : iniciais.ativa !== false;

  return (
    <form action={enviar} className={estilos.formulario} key={JSON.stringify(estado?.valores ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {editando && <input type="hidden" name="id" value={iniciais.id} />}

      <fieldset className={estilos.grupo}>
        <legend>Contato</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Nome
            <input name="nome" required minLength={2} maxLength={160} defaultValue={v("nome")} autoComplete="off" />
            <span className={estilos.dica}>Só o nome. O código (F48…) é criado sozinho.</span>
          </label>
          <label className={estilos.campo}>
            WhatsApp / telefone
            <input name="telefone" type="tel" maxLength={40} defaultValue={v("telefone")} placeholder="(12) 99999-9999" />
          </label>
          <label className={estilos.campo}>
            E-mail
            <input name="email" type="email" maxLength={191} defaultValue={v("email")} />
          </label>
        </div>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend>Pagamento do repasse</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Repasse padrão (%)
            <input name="percentualRepassePadrao" inputMode="decimal" defaultValue={v("percentualRepassePadrao") ?? "40"} />
            <span className={estilos.dica}>
              Parte do valor de venda que vai para a fornecedora. Vale para as peças novas; as já cadastradas e as já vendidas não mudam.
            </span>
          </label>
          <label className={estilos.campo}>
            Chave Pix
            <input name="pix" maxLength={191} defaultValue={v("pix")} />
          </label>
          <label className={estilos.campo}>
            CPF ou CNPJ
            <input name="documento" inputMode="numeric" maxLength={20} defaultValue={v("documento")} />
            <span className={estilos.dica}>Só a administradora vê.</span>
          </label>
        </div>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend>Endereço</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Endereço
            <input name="endereco" maxLength={255} defaultValue={v("endereco")} />
          </label>
          <label className={estilos.campo}>
            CEP
            <input name="cep" inputMode="numeric" maxLength={15} defaultValue={v("cep")} />
          </label>
          <label className={estilos.campo}>
            Cidade
            <input name="cidade" maxLength={100} defaultValue={v("cidade")} />
          </label>
          <label className={estilos.campo}>
            Estado
            <input name="estado" maxLength={60} defaultValue={v("estado")} placeholder="SP" />
          </label>
        </div>
      </fieldset>

      {editando && (
        <label className={estilos.marcar}>
          <input type="checkbox" name="ativa" value="sim" defaultChecked={ativa} />
          Fornecedora ativa
          <span className={estilos.dica}>Desmarque quando ela parar de consignar. O histórico continua guardado.</span>
        </label>
      )}

      <div className={estilos.acoes}>
        <button className={estilos.botao} type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : textoBotao}
        </button>
        <Link href={voltar}>Cancelar</Link>
      </div>
    </form>
  );
}
