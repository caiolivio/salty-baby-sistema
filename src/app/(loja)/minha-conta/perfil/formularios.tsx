"use client";

import { useActionState } from "react";
import estilos from "../../loja.module.css";
import { mudarSenha, salvarPerfil, type EstadoPerfil } from "../acoes";

function Aviso({ estado }: { estado: EstadoPerfil }) {
  if (estado?.erro)
    return (
      <p className={estilos.erro} role="alert">
        {estado.erro}
      </p>
    );
  if (estado?.ok)
    return (
      <p className={estilos.ok} role="status">
        {estado.ok}
      </p>
    );
  return null;
}

export function FormularioPerfil({ nome, email, telefone }: { nome: string; email: string; telefone: string }) {
  const [estado, acao, enviando] = useActionState(salvarPerfil, undefined);
  return (
    <form action={acao} className={estilos.formConta}>
      <Aviso estado={estado} />
      <label>
        Nome
        <input name="nome" defaultValue={nome} autoComplete="name" required maxLength={160} />
      </label>
      <label>
        E-mail (para entrar no site)
        <input name="email" type="email" defaultValue={email} autoComplete="email" required maxLength={191} />
      </label>
      <label>
        WhatsApp (com DDD)
        <input name="telefone" type="tel" inputMode="tel" defaultValue={telefone} autoComplete="tel" required maxLength={20} />
      </label>
      <button type="submit" className={estilos.botaoWhats} disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar meus dados"}
      </button>
    </form>
  );
}

export function FormularioSenha() {
  const [estado, acao, enviando] = useActionState(mudarSenha, undefined);
  return (
    <form action={acao} className={estilos.formConta} key={estado?.ok ? "trocada" : "senha"}>
      <Aviso estado={estado} />
      <label>
        Senha atual
        <input name="atual" type="password" autoComplete="current-password" required maxLength={72} />
      </label>
      <label>
        Nova senha
        <input name="senha" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </label>
      <label>
        Repita a nova senha
        <input name="confirmacao" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </label>
      <button type="submit" className={estilos.botaoWhats} disabled={enviando}>
        {enviando ? "Trocando…" : "Trocar senha"}
      </button>
    </form>
  );
}
