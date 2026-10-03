"use client";

import { useActionState, useState } from "react";
import { CANAIS_DIRETOS, DESTINOS, FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import estilos from "../../formulario.module.css";
import { CampoDoSaldo, type SaldoDaFornecedora } from "../campo-do-saldo";
import { CamposDeDesconto, type PecaDoDesconto } from "../campos-de-desconto";
import { registrarVenda } from "./acoes";

type Opcao = { id: string; nome: string; detalhe: string };

export function FormularioVenda({
  hoje,
  clientes,
  grupos,
  pecas,
  mostrarValores,
  saldos,
}: {
  hoje: string;
  clientes: Opcao[];
  grupos: { id: string; nome: string }[];
  pecas: PecaDoDesconto[];
  mostrarValores: boolean;
  saldos: SaldoDaFornecedora[];
}) {
  const vazia = pecas.length === 0;
  const [estado, acao, enviando] = useActionState(registrarVenda, undefined);
  const v = estado?.valores ?? {};
  const [canal, setCanal] = useState(v.canal ?? "");
  const [cliente, setCliente] = useState(v.clienteId ?? "");
  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <fieldset className={estilos.grupo}>
        <legend>Dados da venda</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Canal
            <select name="canal" defaultValue={v.canal ?? ""} required onChange={(e) => setCanal(e.target.value)}>
              <option value="" disabled>
                Escolha…
              </option>
              {CANAIS_DIRETOS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          {canal === "grupo_whatsapp" && (
            <label className={estilos.campo}>
              Grupo
              <select name="grupo" defaultValue={v.grupo ?? ""} required>
                <option value="" disabled>
                  Escolha…
                </option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={estilos.campo}>
            Forma de pagamento
            <select name="forma" defaultValue={v.forma ?? ""} required>
              <option value="" disabled>
                Escolha…
              </option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            Data da venda
            <input name="data" type="date" defaultValue={v.data || hoje} max={hoje} required />
          </label>
        </div>
        <div className={estilos.opcoes}>
          {DESTINOS.map((d, i) => (
            <label key={d.valor} className={estilos.marcar}>
              <input type="radio" name="destino" value={d.valor} defaultChecked={v.destino ? v.destino === d.valor : i === 0} />{" "}
              {d.nome}
            </label>
          ))}
        </div>
      </fieldset>
      {!vazia && <CamposDeDesconto pecas={pecas} valores={v} mostrarValores={mostrarValores} />}
      {!vazia && <CampoDoSaldo fornecedoras={saldos} valores={v} />}
      <fieldset className={estilos.grupo}>
        <legend>Cliente</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Cliente do cadastro
            <select name="clienteId" defaultValue={v.clienteId ?? ""} onChange={(e) => setCliente(e.target.value)}>
              <option value="">Sem cliente</option>
              <option value="nova">+ Cadastrar nova cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.detalhe && ` · ${c.detalhe}`}
                </option>
              ))}
            </select>
          </label>
          {cliente === "nova" && (
            <>
              <label className={estilos.campo}>
                Nome da nova cliente
                <input name="novaNome" defaultValue={v.novaNome} maxLength={120} required />
              </label>
              <label className={estilos.campo}>
                WhatsApp
                <input name="novaTelefone" type="tel" inputMode="tel" defaultValue={v.novaTelefone} maxLength={20} placeholder="(11) 98765-4321" />
              </label>
            </>
          )}
        </div>
      </fieldset>
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando || vazia}>
          {enviando ? "Registrando…" : "Registrar venda"}
        </button>
      </div>
    </form>
  );
}
