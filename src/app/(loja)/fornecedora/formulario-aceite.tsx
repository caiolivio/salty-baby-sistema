"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, ScrollText } from "lucide-react";
import { FORMAS_RECEBIMENTO, TEXTO_BOTAO_ACEITE, TIPOS_CHAVE_PIX } from "@/lib/fornecedoras/contrato";
import estilos from "../loja.module.css";
import { aceitar } from "./acoes";

export type ValoresAceite = Partial<
  Record<"nome" | "documento" | "telefone" | "email" | "pix" | "pixTipo" | "recebimento", string>
>;

/**
 * O contrato numa caixa com rolagem e, embaixo, os dados e o aceite. O
 * checkbox só libera quando o fim do contrato aparece na tela; a hora em que
 * isso aconteceu vai junto com o aceite.
 */
export function FormularioAceite({
  contrato,
  abertura,
  iniciais,
  textoCheckbox,
  nomeLoja,
}: {
  contrato: ReactNode;
  abertura: string;
  iniciais: ValoresAceite;
  textoCheckbox: string;
  nomeLoja: string;
}) {
  const [estado, acao, enviando] = useActionState(aceitar, undefined);
  // A leitura vale para esta abertura: se o contrato mudar (abertura nova), precisa ler de novo.
  const [leitura, setLeitura] = useState<{ abertura: string; em: number } | null>(null);
  const lidoEm = leitura?.abertura === abertura ? leitura.em : null;
  const fim = useRef<HTMLDivElement>(null);
  const valores: ValoresAceite = estado?.valores ?? iniciais;

  useEffect(() => {
    const alvo = fim.current;
    if (!alvo || lidoEm) return;
    const observador = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) setLeitura({ abertura, em: Date.now() });
    });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [lidoEm, abertura]);

  return (
    <>
      <div className={`${estilos.acordo} ${estilos.contrato}`} tabIndex={0} aria-label="Texto do contrato de consignação">
        {contrato}
        <div ref={fim} className={estilos.fimDoContrato}>
          Fim do contrato
        </div>
      </div>
      <p className={lidoEm ? estilos.sucesso : estilos.dica} role="status">
        {lidoEm ? (
          <>
            <CircleCheck className="icone" aria-hidden /> Você chegou ao fim do contrato.
          </>
        ) : (
          <>
            <ScrollText className="icone" aria-hidden /> Role o contrato até o fim para liberar o aceite.
          </>
        )}
      </p>

      <form action={acao} className={`${estilos.formConta} ${estilos.formLargo}`} key={JSON.stringify(estado ?? null)}>
        {estado?.erro && (
          <p className={estilos.erro} role="alert">
            {estado.erro}
          </p>
        )}
        <input type="hidden" name="abertura" value={abertura} />
        <input type="hidden" name="lido" value={lidoEm ? "sim" : ""} />
        <input type="hidden" name="lido_em" value={lidoEm ?? ""} />
        <p className={estilos.dica}>
          Confira os seus dados. Todos são obrigatórios (a chave Pix só para quem prefere receber por PIX).
        </p>
        <label>
          Nome completo
          <input name="nome" autoComplete="name" required maxLength={160} defaultValue={valores.nome} />
        </label>
        <label>
          CPF
          <input
            name="documento"
            inputMode="numeric"
            required
            maxLength={18}
            defaultValue={valores.documento}
            placeholder="000.000.000-00"
          />
        </label>
        <label>
          WhatsApp
          <input
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            defaultValue={valores.telefone}
          />
        </label>
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required maxLength={191} defaultValue={valores.email} />
          <span className={estilos.dica}>É com ele que você entra na sua área.</span>
        </label>
        <label>
          Chave PIX
          <input name="pix" maxLength={191} defaultValue={valores.pix} />
        </label>
        <label>
          Tipo da chave PIX
          <select name="pixTipo" defaultValue={valores.pixTipo ?? ""}>
            <option value="">Escolha</option>
            {TIPOS_CHAVE_PIX.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <fieldset className={estilos.escolhaRecebimento}>
          <legend>Forma preferencial de recebimento</legend>
          {FORMAS_RECEBIMENTO.map((f) => (
            <label key={f.valor} className={estilos.marcarLinha}>
              <input type="radio" name="recebimento" value={f.valor} required defaultChecked={valores.recebimento === f.valor} />
              <span>{f.valor === "credito" ? `Crédito ${nomeLoja}` : f.nome}</span>
            </label>
          ))}
        </fieldset>
        <label className={estilos.marcarLinha}>
          <input type="checkbox" name="de_acordo" value="sim" required disabled={!lidoEm} />
          <span>{textoCheckbox}</span>
        </label>
        <button type="submit" className={estilos.botaoWhats} disabled={enviando || !lidoEm}>
          {enviando ? "Enviando…" : TEXTO_BOTAO_ACEITE}
        </button>
      </form>
    </>
  );
}
