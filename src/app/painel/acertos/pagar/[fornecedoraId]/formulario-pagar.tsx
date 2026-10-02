"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FORMAS_ACERTO } from "@/lib/acertos/regras";
import { formatarReais } from "@/lib/dinheiro";
import proprios from "../../../formulario.module.css";
import estilos from "../../../painel.module.css";
import { pagarRepasses } from "../../acoes";

export type VendaAPagar = {
  id: string;
  codigo: string;
  nome: string;
  data: string;
  valorPagoCentavos: number;
  repasseCentavos: number;
  marcado: boolean;
};

export function FormularioPagar({ fornecedoraId, vendas, hoje }: { fornecedoraId: string; vendas: VendaAPagar[]; hoje: string }) {
  const [estado, acao, enviando] = useActionState(pagarRepasses, undefined);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(vendas.filter((v) => v.marcado).map((v) => v.id)));
  const total = vendas.filter((v) => marcados.has(v.id)).reduce((s, v) => s + v.repasseCentavos, 0);
  const trocar = (id: string, sim: boolean) =>
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (sim) novo.add(id);
      else novo.delete(id);
      return novo;
    });

  return (
    <form action={acao} className={proprios.formulario}>
      <input type="hidden" name="fornecedoraId" value={fornecedoraId} />
      {estado?.erro && (
        <p className={proprios.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <fieldset className={proprios.grupo}>
        <legend>Vendas a pagar</legend>
        <div className={proprios.acoes}>
          <button type="button" className={proprios.botaoSecundario} onClick={() => setMarcados(new Set(vendas.map((v) => v.id)))}>
            Marcar todas
          </button>
          <button type="button" className={proprios.botaoSecundario} onClick={() => setMarcados(new Set())}>
            Desmarcar todas
          </button>
        </div>
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th className={estilos.marcar}>Pagar</th>
                <th>Peça</th>
                <th>Vendida em</th>
                <th className={estilos.numero}>Valor da venda</th>
                <th className={estilos.numero}>Repasse</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id}>
                  <td className={estilos.marcar}>
                    <input
                      type="checkbox"
                      name="item"
                      value={v.id}
                      checked={marcados.has(v.id)}
                      onChange={(e) => trocar(v.id, e.target.checked)}
                      aria-label={`Pagar ${v.codigo}`}
                    />
                  </td>
                  <td>
                    {v.codigo} · {v.nome}
                  </td>
                  <td className={estilos.curta}>{v.data}</td>
                  <td className={estilos.numero} data-rotulo="Valor da venda">
                    {formatarReais(v.valorPagoCentavos)}
                  </td>
                  <td className={estilos.numero} data-rotulo="Repasse">
                    {formatarReais(v.repasseCentavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p aria-live="polite">
          <strong>
            {marcados.size} {marcados.size === 1 ? "venda marcada" : "vendas marcadas"} · Total a pagar: {formatarReais(total)}
          </strong>
        </p>
      </fieldset>
      <fieldset className={proprios.grupo}>
        <legend>Pagamento</legend>
        <div className={proprios.grade}>
          <label className={proprios.campo}>
            Data do pagamento
            <input name="data" type="date" defaultValue={estado?.data || hoje} max={hoje} required />
          </label>
          <label className={proprios.campo}>
            Forma
            <select name="forma" defaultValue={estado?.forma ?? "pix"} required>
              {FORMAS_ACERTO.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={proprios.campo}>
          Observação (opcional, vai no comprovante)
          <input name="observacao" maxLength={200} defaultValue={estado?.observacao ?? ""} />
        </label>
      </fieldset>
      <div className={proprios.acoes}>
        <button type="submit" className={proprios.botao} disabled={enviando || marcados.size === 0}>
          {enviando ? "Registrando…" : `Registrar pagamento de ${formatarReais(total)}`}
        </button>
        <Link href="/painel/acertos" className={proprios.botaoSecundario}>
          Voltar
        </Link>
      </div>
    </form>
  );
}
