"use client";

import estilos from "../formulario.module.css";

/**
 * Formulário das etiquetas: as caixinhas de cada linha da lista apontam para
 * ele (atributo form="etiquetas") e o envio abre /etiquetas com as marcadas.
 */
export function ImprimirEtiquetas({ voltar }: { voltar: string }) {
  function marcarTodas() {
    const caixas = [...document.querySelectorAll<HTMLInputElement>('input[form="etiquetas"][name="ids"]')];
    const marcar = caixas.some((c) => !c.checked);
    for (const c of caixas) c.checked = marcar;
  }

  return (
    <form id="etiquetas" action="/etiquetas" className={estilos.acoes} data-consulta>
      <input type="hidden" name="voltar" value={voltar} />
      <button type="button" className={estilos.botaoSecundario} onClick={marcarTodas}>
        Marcar todas desta página
      </button>
      <button type="submit" className={estilos.botaoSecundario}>
        Imprimir etiquetas das marcadas
      </button>
    </form>
  );
}
