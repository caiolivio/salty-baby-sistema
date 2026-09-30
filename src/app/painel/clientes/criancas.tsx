"use client";

import { useActionState } from "react";
import estilos from "../formulario.module.css";
import visual from "./cliente.module.css";
import { gravarCrianca, removerCrianca } from "./acoes";

export type ValoresCrianca = { id?: string; nome: string; nascimento: string; sexo: string; resumo?: string };

/** Formulário de uma criança: sem id inclui uma nova; com id edita e permite remover. */
export function FormularioCrianca({ clienteId, crianca, hoje }: { clienteId: string; crianca?: ValoresCrianca; hoje: string }) {
  const [estado, acao, enviando] = useActionState(gravarCrianca, undefined);
  const v = estado?.erro && estado.valores ? estado.valores : (crianca ?? { nome: "", nascimento: "", sexo: "" });
  const nova = !crianca?.id;
  return (
    <div className={visual.crianca}>
      <h3>{nova ? "Cadastrar criança" : (crianca?.resumo ?? crianca?.nome)}</h3>
      <form action={acao} key={JSON.stringify(estado ?? null)}>
        <input type="hidden" name="clienteId" value={clienteId} />
        {crianca?.id && <input type="hidden" name="id" value={crianca.id} />}
        {estado?.erro && (
          <p className={estilos.erro} role="alert">
            {estado.erro}
          </p>
        )}
        {estado?.ok && (
          <p className={estilos.aviso} role="status">
            {estado.ok}
          </p>
        )}
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Nome
            <input name="nome" defaultValue={nova && estado?.ok ? "" : v.nome} maxLength={80} required />
          </label>
          <label className={estilos.campo}>
            Nascimento
            <input name="nascimento" type="date" max={hoje} defaultValue={nova && estado?.ok ? "" : v.nascimento} />
          </label>
          <label className={estilos.campo}>
            Sexo
            <select name="sexo" defaultValue={nova && estado?.ok ? "" : v.sexo}>
              <option value="">Não informado</option>
              <option value="feminino">Menina</option>
              <option value="masculino">Menino</option>
            </select>
          </label>
        </div>
        <div className={estilos.acoes}>
          <button type="submit" className={nova ? estilos.botao : estilos.botaoSecundario} disabled={enviando}>
            {enviando ? "Salvando…" : nova ? "Incluir criança" : "Salvar"}
          </button>
          {!nova && (
            <button
              type="submit"
              formAction={removerCrianca}
              formNoValidate
              className={estilos.botaoSecundario}
              onClick={(e) => {
                if (!confirm(`Remover ${crianca?.nome} do cadastro?`)) e.preventDefault();
              }}
            >
              Remover
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
