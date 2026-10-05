"use client";

import { useActionState } from "react";
import estilos from "../formulario.module.css";
import visual from "./cliente.module.css";
import { TAMANHOS } from "@/lib/tamanhos";
import { gravarCrianca, removerCrianca, type EstadoCrianca } from "./acoes";

export type ValoresCrianca = { id?: string; nome: string; nascimento: string; sexo: string; tamanho: string; resumo?: string };

/**
 * Formulário de uma criança: sem id inclui uma nova; com id edita e permite
 * remover. No painel grava na ficha escolhida; na área da cliente, as ações
 * dela (que só mexem na própria ficha) vêm por "gravar" e "remover".
 */
export function FormularioCrianca({
  clienteId,
  crianca,
  hoje,
  gravar = gravarCrianca,
  remover = removerCrianca,
}: {
  clienteId: string;
  crianca?: ValoresCrianca;
  hoje: string;
  gravar?: (estado: EstadoCrianca, dados: FormData) => Promise<EstadoCrianca>;
  remover?: (dados: FormData) => Promise<void>;
}) {
  const [estado, acao, enviando] = useActionState(gravar, undefined);
  const v = estado?.erro && estado.valores ? estado.valores : (crianca ?? { nome: "", nascimento: "", sexo: "", tamanho: "" });
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
          <label className={estilos.campo}>
            Tamanho que veste hoje
            <select name="tamanho" defaultValue={nova && estado?.ok ? "" : v.tamanho}>
              <option value="">Não sei (uso o nascimento)</option>
              {TAMANHOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.nome}
                </option>
              ))}
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
              formAction={remover}
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
