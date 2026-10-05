"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { formatarReais } from "@/lib/dinheiro";
import estilos from "../loja.module.css";
import { fechar } from "./acoes";

export function FecharPedido({
  nome,
  telefone,
  saldoCentavos,
  totalCentavos,
  sacolinha,
}: {
  nome?: string;
  telefone?: string;
  /** Saldo para compras, se quem está logada é uma fornecedora com saldo. */
  saldoCentavos?: number;
  totalCentavos?: number;
  /** Explicação da sacolinha e, se a cliente logada já tem uma aberta, até quando. */
  sacolinha: { explicacao: string[]; abertaAte?: string };
}) {
  const [estado, acao, enviando] = useActionState(fechar, undefined);
  // O botão fica fora do formulário (ligado pelo `form`) para, no celular,
  // ficar preso no rodapé da tela com o total enquanto a cliente rola as peças.
  return (
    <>
      <form id="fechar-pedido" action={acao} className={estilos.fechar} key={JSON.stringify(estado ?? null)}>
        {estado?.erro && (
          <p className={estilos.erro} role="alert">
            {estado.erro}
          </p>
        )}
        <label>
          Seu nome
          <input name="nome" defaultValue={estado?.nome ?? nome} autoComplete="name" maxLength={120} required />
        </label>
        <label>
          Seu WhatsApp (com DDD)
          <input
            name="telefone"
            type="tel"
            defaultValue={estado?.telefone ?? telefone}
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            required
          />
        </label>
        <fieldset className={estilos.receber}>
          <legend>Como você quer receber?</legend>
          <label>
            <input type="radio" name="receber" value="agora" defaultChecked={!estado?.sacolinha} />
            <span>
              <strong>Receber agora</strong>
              <small>Envio ou retirada logo depois do pagamento.</small>
            </span>
          </label>
          <label title="Pagar e receber depois">
            <input type="radio" name="receber" value="sacolinha" defaultChecked={estado?.sacolinha} />
            <span>
              <strong>Colocar na sacolinha</strong>
              <small>Pague agora e receba depois, junto com outras compras.</small>
            </span>
          </label>
          <details>
            <summary>O que é a sacolinha?</summary>
            {sacolinha.explicacao.map((t) => (
              <p key={t}>{t}</p>
            ))}
            {sacolinha.abertaAte && <p>Você já tem uma sacolinha aberta até {sacolinha.abertaAte}: estas peças entram nela.</p>}
          </details>
        </fieldset>
        {saldoCentavos ? (
          <label className={estilos.marcarLinha}>
            <input type="checkbox" name="usar_saldo" value="sim" defaultChecked />
            <span>
              Pagar com o meu saldo de fornecedora ({formatarReais(saldoCentavos)} disponível)
              {totalCentavos && totalCentavos > saldoCentavos
                ? `. O saldo cobre ${formatarReais(saldoCentavos)}, e o resto (${formatarReais(totalCentavos - saldoCentavos)}) você combina com a loja.`
                : "."}
            </span>
          </label>
        ) : null}
        <span className={estilos.dica}>
          Ao fechar o pedido, abrimos o WhatsApp da loja com a mensagem pronta. As peças ficam reservadas para você por 15 minutos, enquanto
          combina o pagamento.
        </span>
      </form>
      <div className={estilos.acaoFixa}>
        {totalCentavos ? <strong className={estilos.precoNaBarra}>{formatarReais(totalCentavos)}</strong> : null}
        <button type="submit" form="fechar-pedido" className={estilos.botaoWhats} disabled={enviando}>
          <Send className="icone" aria-hidden />
          {enviando ? "Reservando…" : "Fechar pedido"}
        </button>
      </div>
    </>
  );
}
