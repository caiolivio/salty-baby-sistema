"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import estilos from "../formulario.module.css";
import { incluirCategoriaNoCadastro } from "../categorias/acoes";

type Categoria = { id: string; nome: string };

/** Categorias para marcar, com a opção de incluir uma nova sem sair do cadastro. */
export function EscolherCategorias({
  categorias,
  marcadas,
  podeIncluir,
}: {
  categorias: Categoria[];
  marcadas: Set<string>;
  podeIncluir: boolean;
}) {
  const [novas, setNovas] = useState<Categoria[]>([]);
  const [incluindo, setIncluindo] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string>();
  const [salvando, iniciar] = useTransition();
  const router = useRouter();
  const todas = [...categorias, ...novas.filter((n) => !categorias.some((c) => c.id === n.id))];
  const marcadaAgora = new Set([...marcadas, ...novas.map((n) => n.id)]);

  function incluir() {
    setErro(undefined);
    iniciar(async () => {
      const resultado = await incluirCategoriaNoCadastro(nome);
      if (!resultado.ok) return setErro(resultado.erro);
      setNovas((lista) => [...lista.filter((n) => n.id !== resultado.id), { id: resultado.id, nome: resultado.nome }]);
      setNome("");
      setIncluindo(false);
      router.refresh(); // a lista da página passa a ter a categoria nova

    });
  }

  return (
    <fieldset className={estilos.opcoes}>
      <legend>Categorias</legend>
      <span className={estilos.dica}>Marque uma ou mais.</span>
      <div className={estilos.marcas}>
        {todas.map((c) => (
          <label key={c.id} className={estilos.marca}>
            <input type="checkbox" name="categorias" value={c.id} defaultChecked={marcadaAgora.has(c.id)} />
            {c.nome}
          </label>
        ))}
        {podeIncluir && !incluindo && (
          <button type="button" className={estilos.botaoSecundario} onClick={() => setIncluindo(true)}>
            <Plus className="icone" aria-hidden />
            Nova categoria
          </button>
        )}
      </div>
      {incluindo && (
        <div className={estilos.acoes}>
          <label className={estilos.campo}>
            <span className={estilos.escondido}>Nome da nova categoria</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                // Enter aqui inclui a categoria, em vez de salvar a peça inteira.
                if (e.key === "Enter") {
                  e.preventDefault();
                  incluir();
                }
              }}
              maxLength={60}
              placeholder="Ex.: Enxoval"
              autoFocus
            />
          </label>
          <button type="button" className={estilos.botaoSecundario} onClick={incluir} disabled={salvando}>
            {salvando ? "Incluindo…" : "Incluir"}
          </button>
          <button type="button" className={estilos.link} onClick={() => setIncluindo(false)}>
            Cancelar
          </button>
        </div>
      )}
      {erro && (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      )}
    </fieldset>
  );
}
