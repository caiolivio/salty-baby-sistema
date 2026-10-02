"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoCliente } from "./acoes";
import estilos from "../formulario.module.css";

type Acao = (estado: EstadoCliente, dados: FormData) => Promise<EstadoCliente>;

export type ValoresCliente = Partial<
  Record<"id" | "nome" | "telefone" | "email" | "cpf" | "endereco" | "cep" | "cidade" | "estado" | "observacao", string>
>;

export function FormularioCliente({
  acao,
  iniciais,
  textoBotao,
  voltar,
  mostrarCpf,
}: {
  acao: Acao;
  iniciais: ValoresCliente;
  textoBotao: string;
  voltar: string;
  mostrarCpf: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(acao, undefined);
  // Depois de um erro, o formulário volta com o que a pessoa digitou.
  const v = (campo: keyof ValoresCliente) => (estado?.valores ? estado.valores[campo] : iniciais[campo]);

  return (
    <form action={enviar} className={estilos.formulario} key={JSON.stringify(estado?.valores ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {iniciais.id && <input type="hidden" name="id" value={iniciais.id} />}

      <fieldset className={estilos.grupo}>
        <legend>Contato</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Nome
            <input name="nome" required minLength={2} maxLength={160} defaultValue={v("nome")} autoComplete="off" />
          </label>
          <label className={estilos.campo}>
            WhatsApp
            <input name="telefone" type="tel" inputMode="tel" maxLength={40} defaultValue={v("telefone")} placeholder="(11) 98765-4321" />
          </label>
          <label className={estilos.campo}>
            E-mail
            <input name="email" type="email" maxLength={191} defaultValue={v("email")} />
          </label>
          {mostrarCpf && (
            <label className={estilos.campo}>
              CPF
              <input name="cpf" inputMode="numeric" maxLength={20} defaultValue={v("cpf")} />
              <span className={estilos.dica}>Só a administradora vê.</span>
            </label>
          )}
        </div>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend>Endereço para envio</legend>
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

      <label className={estilos.campo}>
        Observações
        <textarea name="observacao" rows={3} maxLength={2000} defaultValue={v("observacao")} />
      </label>

      <div className={estilos.acoes}>
        <button className={estilos.botao} type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : textoBotao}
        </button>
        <Link href={voltar}>Cancelar</Link>
      </div>
    </form>
  );
}
