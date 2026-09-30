"use client";

import { useActionState } from "react";
import { PAPEIS_GRUPO } from "@/lib/grupos/regras";
import estilos from "../formulario.module.css";
import { novoGrupo, salvarGrupo } from "./acoes";

function EscolherPapel({ papel }: { papel?: string | null }) {
  return (
    <label className={estilos.campo}>
      Sugerido para
      <select name="papel" defaultValue={papel ?? ""}>
        <option value="">Nenhuma sugestão automática</option>
        {PAPEIS_GRUPO.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.nome}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NovoGrupo() {
  const [estado, enviar, enviando] = useActionState(novoGrupo, undefined);
  return (
    <form action={enviar} className={estilos.formulario} key={estado?.aviso ?? ""}>
      <div className={estilos.grade}>
        <label className={estilos.campo}>
          Novo grupo
          <input name="nome" required minLength={2} maxLength={60} placeholder="Ex.: Enxoval" />
        </label>
        <EscolherPapel />
      </div>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.aviso && (
        <p className={estilos.aviso} role="status">
          {estado.aviso}
        </p>
      )}
      <div className={estilos.acoes}>
        <button className={estilos.botao} type="submit" disabled={enviando}>
          {enviando ? "Incluindo…" : "Incluir grupo"}
        </button>
      </div>
    </form>
  );
}

export function EditarGrupo({
  id,
  nome,
  codigo,
  papel,
  ativo,
}: {
  id: string;
  nome: string;
  codigo: string;
  papel: string | null;
  ativo: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(salvarGrupo, undefined);
  return (
    <form action={enviar} className={estilos.linhaCategoria}>
      <input type="hidden" name="id" value={id} />
      <label className={estilos.campo}>
        Nome
        <input name="nome" required minLength={2} maxLength={60} defaultValue={nome} />
      </label>
      <EscolherPapel papel={papel} />
      <label className={estilos.marcar}>
        <input type="checkbox" name="ativo" value="sim" defaultChecked={ativo} />
        Em uso
      </label>
      <span className={estilos.dica}>Marca no link: ?g={codigo}</span>
      <button className={estilos.botaoSecundario} type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar"}
      </button>
      {estado?.erro && (
        <span className={estilos.erro} role="alert">
          {estado.erro}
        </span>
      )}
      {estado?.aviso && !enviando && <span role="status">{estado.aviso}</span>}
    </form>
  );
}
