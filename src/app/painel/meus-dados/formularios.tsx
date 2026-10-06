"use client";

import { useActionState } from "react";
import { CampoSenha } from "@/componentes/campo-senha";
import proprios from "../formulario.module.css";
import { mudarMinhaSenha, salvarMeusDados, type EstadoMeusDados } from "./acoes";

function Aviso({ estado }: { estado: EstadoMeusDados }) {
  if (estado?.erro)
    return (
      <p className={proprios.erro} role="alert">
        {estado.erro}
      </p>
    );
  if (estado?.ok)
    return (
      <p className={proprios.aviso} role="status">
        {estado.ok}
      </p>
    );
  return null;
}

export function FormularioMeusDados({ iniciais }: { iniciais: { nome: string; email: string; whatsapp: string } }) {
  const [estado, acao, enviando] = useActionState(salvarMeusDados, undefined);
  const v = (campo: keyof typeof iniciais) => estado?.valores?.[campo] ?? iniciais[campo];
  return (
    <form action={acao} className={proprios.formulario} key={JSON.stringify(estado?.valores ?? null)}>
      <Aviso estado={estado} />
      <div className={proprios.grade}>
        <label className={proprios.campo}>
          Nome
          <input name="nome" required minLength={2} maxLength={120} defaultValue={v("nome")} autoComplete="name" />
        </label>
        <label className={proprios.campo}>
          E-mail (para entrar)
          <input name="email" type="email" required maxLength={191} defaultValue={v("email")} autoComplete="email" />
        </label>
        <label className={proprios.campo}>
          WhatsApp
          <input name="whatsapp" type="tel" maxLength={40} defaultValue={v("whatsapp")} placeholder="(12) 99999-9999" />
        </label>
      </div>
      <div className={proprios.acoes}>
        <button type="submit" className={proprios.botao} disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar meus dados"}
        </button>
      </div>
    </form>
  );
}

export function FormularioMinhaSenha() {
  const [estado, acao, enviando] = useActionState(mudarMinhaSenha, undefined);
  return (
    <form action={acao} className={proprios.formulario} key={estado?.ok ?? "senha"}>
      <Aviso estado={estado} />
      <div className={proprios.grade}>
        <label className={proprios.campo}>
          Senha atual
          <CampoSenha name="atual" autoComplete="current-password" required maxLength={72} />
        </label>
        <label className={proprios.campo}>
          Nova senha (pelo menos 8 caracteres)
          <CampoSenha name="senha" autoComplete="new-password" required minLength={8} maxLength={72} />
        </label>
        <label className={proprios.campo}>
          Repita a nova senha
          <CampoSenha name="confirmacao" autoComplete="new-password" required minLength={8} maxLength={72} />
        </label>
      </div>
      <div className={proprios.acoes}>
        <button type="submit" className={proprios.botao} disabled={enviando}>
          {enviando ? "Trocando…" : "Trocar a senha"}
        </button>
      </div>
    </form>
  );
}
