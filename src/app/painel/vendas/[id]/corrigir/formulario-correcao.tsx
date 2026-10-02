"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import estilos from "../../../formulario.module.css";
import { CamposDeDesconto, type PecaDoDesconto } from "../../campos-de-desconto";
import { corrigir } from "./acoes";

export function FormularioCorrecao({
  id,
  hoje,
  pecas,
  iniciais,
  mostrarValores,
}: {
  id: string;
  hoje: string;
  pecas: PecaDoDesconto[];
  iniciais: Record<string, string>;
  mostrarValores: boolean;
}) {
  const [estado, acao, enviando] = useActionState(corrigir, undefined);
  const v = estado?.valores ?? iniciais;
  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      <input type="hidden" name="id" value={id} />
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      <fieldset className={estilos.grupo}>
        <legend>Pagamento</legend>
        <div className={estilos.grade}>
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
      </fieldset>
      <CamposDeDesconto pecas={pecas} valores={v} mostrarValores={mostrarValores} />
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar correção"}
        </button>
        <Link href="/painel/vendas" className={estilos.botaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
