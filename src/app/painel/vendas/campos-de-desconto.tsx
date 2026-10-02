"use client";

import { useRef, useState } from "react";
import { formatarReais } from "@/lib/dinheiro";
import { dividirDescontos, lerPlanoDeDesconto, MODOS_CARRINHO, QUEM_PAGA, type ModoCarrinho } from "@/lib/vendas/descontos";
import { calcularItens } from "@/lib/vendas/regras";
import estilos from "../formulario.module.css";
import tabela from "../painel.module.css";
import proprios from "./descontos.module.css";

export type PecaDoDesconto = {
  id: string;
  codigo: string;
  nome: string;
  precoCentavos: number;
  loja: boolean;
  /** Só chegam aqui para quem pode ver custo, repasse e lucro. */
  percentualRepasse: number | null;
  custoCentavos: number | null;
};

const ROTULOS: Record<ModoCarrinho, string> = {
  reais: "Desconto no carrinho (R$)",
  percentual: "Desconto no carrinho (%)",
  valor_pago: "Valor que a cliente pagou (R$)",
};

/**
 * Campos de desconto da confirmação de pagamento e da venda direta: desconto no
 * carrinho (R$, % ou valor pago), desconto por peça e quem paga cada um, com a
 * prévia calculada pelas mesmas regras do servidor.
 */
export function CamposDeDesconto({
  pecas,
  valores = {},
  mostrarValores,
}: {
  pecas: PecaDoDesconto[];
  valores?: Record<string, string>;
  mostrarValores: boolean;
}) {
  const caixa = useRef<HTMLFieldSetElement>(null);
  const [modo, setModo] = useState<ModoCarrinho>(
    MODOS_CARRINHO.find((m) => m.valor === valores.desconto_modo)?.valor ?? "reais",
  );
  const [abertas, setAbertas] = useState<string[]>(pecas.filter((p) => valores[`peca_desconto:${p.id}`]).map((p) => p.id));
  const [digitado, setDigitado] = useState<Record<string, string>>(valores);
  const temConsignada = pecas.some((p) => !p.loja);

  const atualizar = () => {
    const form = caixa.current?.form;
    if (form) setDigitado(Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v)])));
  };

  const plano = lerPlanoDeDesconto(digitado, pecas);
  const partes = plano.ok ? dividirDescontos(pecas, plano.dados) : plano;
  const calculo =
    plano.ok && partes.ok && mostrarValores
      ? calcularItens(
          pecas.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            tipo: p.loja ? ("loja" as const) : ("consignada" as const),
            precoCentavos: p.precoCentavos,
            percentualRepasse: p.percentualRepasse,
            percentualPadraoFornecedora: null,
            custoCentavos: p.custoCentavos,
          })),
          plano.dados,
        )
      : null;
  const erro = !plano.ok ? plano.erro : !partes.ok ? partes.erro : calculo && !calculo.ok ? calculo.erro : null;
  const linhas = partes.ok ? partes.dados : null;
  const itens = calculo?.ok ? calculo.itens : null;
  const total = pecas.reduce((s, p) => s + p.precoCentavos, 0);
  const pago = linhas ? linhas.reduce((s, l) => s + l.valorPago, 0) : null;
  const comPrejuizo = itens?.some((i) => i.lucroCentavos < 0);

  return (
    <fieldset className={estilos.grupo} ref={caixa} onInput={atualizar} onChange={atualizar}>
      <legend>Desconto (opcional)</legend>
      <p className={estilos.dica}>
        Use quando o valor combinado com a cliente for diferente do carrinho. &quot;Dividido&quot; é a regra do acordo: o repasse da
        fornecedora é calculado sobre o valor com desconto. &quot;Por conta da fornecedora&quot; só com o combinado dela.
      </p>
      <div className={estilos.grade}>
        <label className={estilos.campo}>
          Tipo de desconto
          <select name="desconto_modo" value={modo} onChange={(e) => setModo(e.target.value as ModoCarrinho)}>
            {MODOS_CARRINHO.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <label className={estilos.campo}>
          {ROTULOS[modo]}
          <input
            name="desconto"
            inputMode="decimal"
            placeholder={modo === "percentual" ? "10" : "0,00"}
            defaultValue={valores.desconto}
            autoComplete="off"
          />
          {modo === "valor_pago" && <span className={estilos.dica}>O sistema calcula o desconto. Total do carrinho: {formatarReais(total)}.</span>}
        </label>
        {temConsignada && (
          <label className={estilos.campo}>
            Quem paga o desconto do carrinho
            <select name="desconto_quem" defaultValue={valores.desconto_quem ?? "dividido"}>
              {QUEM_PAGA.map((q) => (
                <option key={q.valor} value={q.valor}>
                  {q.nome}
                </option>
              ))}
            </select>
            <span className={estilos.dica}>Nas peças da loja o desconto é sempre da loja.</span>
          </label>
        )}
      </div>

      <ul className={proprios.pecas}>
        {pecas.map((p) => {
          const aberta = abertas.includes(p.id);
          return (
            <li key={p.id}>
              <span>
                <strong>{p.codigo}</strong> · {p.nome} · {formatarReais(p.precoCentavos)}
              </span>
              {aberta ? (
                <span className={proprios.campos}>
                  <input
                    name={`peca_desconto:${p.id}`}
                    inputMode="decimal"
                    placeholder="0,00"
                    defaultValue={valores[`peca_desconto:${p.id}`]}
                    aria-label={`Desconto da peça ${p.codigo}`}
                    autoComplete="off"
                    autoFocus={!valores[`peca_desconto:${p.id}`]}
                  />
                  <select name={`peca_tipo:${p.id}`} defaultValue={valores[`peca_tipo:${p.id}`] ?? "reais"} aria-label="Em R$ ou %">
                    <option value="reais">R$</option>
                    <option value="percentual">%</option>
                  </select>
                  {!p.loja && (
                    <select name={`peca_quem:${p.id}`} defaultValue={valores[`peca_quem:${p.id}`] ?? "dividido"} aria-label="Quem paga">
                      {QUEM_PAGA.map((q) => (
                        <option key={q.valor} value={q.valor}>
                          {q.nome}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    className={proprios.tirar}
                    onClick={() => {
                      setAbertas(abertas.filter((id) => id !== p.id));
                      setTimeout(atualizar);
                    }}
                  >
                    Tirar
                  </button>
                </span>
              ) : (
                <button type="button" className={proprios.abrir} onClick={() => setAbertas([...abertas, p.id])}>
                  Dar desconto nesta peça
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <label className={estilos.campo}>
        Motivo do desconto
        <input name="desconto_motivo" maxLength={200} defaultValue={valores.desconto_motivo} placeholder="Ex.: cliente fiel, peça com defeito" />
      </label>

      {erro ? (
        <p className={estilos.erro} role="status">
          {erro}
        </p>
      ) : (
        linhas &&
        pago !== null &&
        pago !== total && (
          <div className={tabela.tabelaCaixa} role="status">
            <table className={tabela.tabela}>
              <thead>
                <tr>
                  <th>Peça</th>
                  <th className={tabela.numero}>Preço</th>
                  <th className={tabela.numero}>Desconto</th>
                  <th className={tabela.numero}>Cliente paga</th>
                  {itens && <th className={tabela.numero}>Repasse</th>}
                  {itens && <th className={tabela.numero}>Lucro</th>}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={l.pecaId}>
                    <td>{pecas[i].codigo}</td>
                    <td className={tabela.numero} data-rotulo="Preço">
                      {formatarReais(l.precoCentavos)}
                    </td>
                    <td className={tabela.numero} data-rotulo="Desconto">
                      {formatarReais(l.descontoPeca + l.descontoCarrinho)}
                    </td>
                    <td className={tabela.numero} data-rotulo="Cliente paga">
                      {formatarReais(l.valorPago)}
                    </td>
                    {itens && (
                      <td className={tabela.numero} data-rotulo="Repasse">
                        {pecas[i].loja ? "–" : formatarReais(itens[i].repasseCentavos)}
                      </td>
                    )}
                    {itens && (
                      <td className={`${tabela.numero} ${itens[i].lucroCentavos < 0 ? proprios.prejuizo : ""}`} data-rotulo="Lucro">
                        {formatarReais(itens[i].lucroCentavos)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={proprios.total}>
              Total com desconto: <strong>{formatarReais(pago)}</strong> (desconto de {formatarReais(total - pago)})
            </p>
            {comPrejuizo && <p className={`${estilos.erro} ${proprios.total}`}>Atenção: com este desconto, a loja tem prejuízo em pelo menos uma peça.</p>}
          </div>
        )
      )}
    </fieldset>
  );
}
