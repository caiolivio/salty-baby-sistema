"use client";

import Link from "next/link";
import { CampoSenha } from "@/componentes/campo-senha";
import { useActionState } from "react";
import estilos from "@/componentes/formulario.module.css";
import { Desafio } from "@/componentes/desafio";
import { cadastrar } from "./acoes";

export function FormularioCadastro({ voltar, desafio }: { voltar?: string; desafio: { imagem: string; ficha: string } }) {
  const [estado, acao, enviando] = useActionState(cadastrar, undefined);

  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      {estado?.erro && (
        <div className={estilos.erro} role="alert">
          <p>{estado.erro}</p>
          {estado.ajuda && (
            <p>
              <a href={estado.ajuda.link} target="_blank" rel="noopener noreferrer">
                {estado.ajuda.texto}
              </a>
            </p>
          )}
        </div>
      )}
      <label className={estilos.campo}>
        Nome
        <input name="nome" autoComplete="name" required maxLength={160} defaultValue={estado?.nome} />
      </label>
      <label className={estilos.campo}>
        E-mail
        <input name="email" type="email" autoComplete="email" required maxLength={191} defaultValue={estado?.email} />
      </label>
      <label className={estilos.campo}>
        WhatsApp (com DDD)
        <input
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          maxLength={20}
          placeholder="(11) 98765-4321"
          defaultValue={estado?.telefone}
        />
      </label>
      <label className={estilos.campo}>
        Senha
        <CampoSenha name="senha" autoComplete="new-password" required minLength={8} maxLength={72} />
        <span className={estilos.dica}>Pelo menos 8 caracteres, com letras e números.</span>
      </label>
      <label className={estilos.campo}>
        Repita a senha
        <CampoSenha name="confirmacao" autoComplete="new-password" required minLength={8} maxLength={72} />
      </label>
      <label className={estilos.marcar}>
        <input type="checkbox" name="privacidade" value="sim" required />
        <span>
          Li e aceito o{" "}
          <Link href="/privacidade" target="_blank">
            aviso de privacidade
          </Link>
          .
        </span>
      </label>
      <Desafio inicial={estado?.desafio ?? desafio} />
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <button className={estilos.botao} type="submit" disabled={enviando}>
        {enviando ? "Criando…" : "Criar minha conta"}
      </button>
    </form>
  );
}
