"use client";

import { useState } from "react";
import type { Periodo } from "@/lib/clientes/perfil";
import estilos from "../formulario.module.css";
import cliente from "./cliente.module.css";

/** Escolha do período do resumo: anual (padrão), um mês ou datas. Recarrega a página com o filtro. */
export function EscolherPeriodo({ periodo, hoje }: { periodo: Periodo; hoje: string }) {
  const [tipo, setTipo] = useState(periodo.tipo);
  return (
    <form method="get" action="#resumo" className={cliente.periodo}>
      <label className={estilos.campo}>
        Ver resumo
        <select name="periodo" value={tipo} onChange={(e) => setTipo(e.target.value as Periodo["tipo"])}>
          <option value="anual">Anual (últimos 12 meses)</option>
          <option value="mensal">Mensal</option>
          <option value="periodo">Por período</option>
        </select>
      </label>
      {tipo === "mensal" && (
        <label className={estilos.campo}>
          Mês
          <input type="month" name="mes" defaultValue={periodo.mes} max={hoje.slice(0, 7)} required />
        </label>
      )}
      {tipo === "periodo" && (
        <>
          <label className={estilos.campo}>
            De
            <input type="date" name="de" defaultValue={periodo.tipo === "periodo" ? periodo.de : ""} max={hoje} required />
          </label>
          <label className={estilos.campo}>
            Até
            <input type="date" name="ate" defaultValue={periodo.tipo === "periodo" ? periodo.ate : hoje} max={hoje} required />
          </label>
        </>
      )}
      <button type="submit" className={estilos.botaoSecundario}>
        Ver
      </button>
    </form>
  );
}
