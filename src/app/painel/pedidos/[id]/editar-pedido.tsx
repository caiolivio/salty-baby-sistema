"use client";

import { useActionState } from "react";
import estilos from "../../formulario.module.css";
import { incluirPeca, salvarCliente, tirarPeca } from "../acoes";

/** Botão "Tirar" de cada peça do pedido. */
export function TirarPeca({ id, pecaId, codigo }: { id: string; pecaId: string; codigo: string }) {
  const [estado, acao, enviando] = useActionState(tirarPeca, undefined);
  return (
    <form action={acao}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="pecaId" value={pecaId} />
      <button type="submit" className={estilos.botaoSecundario} disabled={enviando} aria-label={`Tirar ${codigo} do pedido`}>
        {enviando ? "Tirando…" : "Tirar"}
      </button>
      {estado?.erro && (
        <span className={estilos.erro} role="alert">
          {estado.erro}
        </span>
      )}
    </form>
  );
}

/** Inclui uma peça pelo código (o mesmo da etiqueta, ou o antigo do Notion). */
export function IncluirPeca({ id }: { id: string }) {
  const [estado, acao, enviando] = useActionState(incluirPeca, undefined);
  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      <input type="hidden" name="id" value={id} />
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
          Incluir peça pelo código
          <input name="codigo" defaultValue={estado?.codigo} placeholder="F06-00001" autoCapitalize="characters" required />
          <span className={estilos.dica}>A peça precisa estar à venda. O total do pedido é recalculado.</span>
        </label>
      </div>
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botaoSecundario} disabled={enviando}>
          {enviando ? "Incluindo…" : "Incluir no pedido"}
        </button>
      </div>
    </form>
  );
}

type Opcao = { id: string; nome: string; detalhe: string };

/** Nome, WhatsApp, cliente do cadastro e observações do pedido. */
export function DadosCliente({
  id,
  nome,
  telefone,
  clienteId,
  observacao,
  clientes,
  sugestao,
}: {
  id: string;
  nome: string;
  telefone: string;
  clienteId: string;
  observacao: string;
  clientes: Opcao[];
  sugestao?: Opcao;
}) {
  const [estado, acao, enviando] = useActionState(salvarCliente, undefined);
  const valores = estado?.erro ? estado : { nome, telefone, clienteId: clienteId || sugestao?.id || "", observacao };
  return (
    <form action={acao} className={estilos.formulario} key={JSON.stringify(estado ?? null)}>
      <input type="hidden" name="id" value={id} />
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p className={estilos.aviso} role="status">
          Dados da cliente salvos.
        </p>
      )}
      <fieldset className={estilos.grupo}>
        <legend>Editar dados da cliente</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Nome
            <input name="nome" defaultValue={valores.nome} maxLength={120} required />
          </label>
          <label className={estilos.campo}>
            WhatsApp
            <input name="telefone" type="tel" inputMode="tel" defaultValue={valores.telefone} maxLength={20} placeholder="(12) 98105-3623" />
          </label>
          <label className={estilos.campo}>
            Cliente do cadastro
            <select name="clienteId" defaultValue={valores.clienteId}>
              <option value="">Nenhuma</option>
              <option value="nova">+ Cadastrar como nova cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.detalhe && ` · ${c.detalhe}`}
                </option>
              ))}
            </select>
            {sugestao && !clienteId && (
              <span className={estilos.dica}>Sugerida pelo nome ou WhatsApp: {sugestao.nome}. Confira e salve.</span>
            )}
          </label>
          <label className={estilos.campo}>
            Observações
            <textarea name="observacao" defaultValue={valores.observacao} rows={3} maxLength={2000} />
          </label>
        </div>
      </fieldset>
      <div className={estilos.acoes}>
        <button type="submit" className={estilos.botao} disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar dados da cliente"}
        </button>
      </div>
    </form>
  );
}
