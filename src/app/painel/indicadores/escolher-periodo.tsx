"use client";

import { useState } from "react";
import type { Periodo } from "@/lib/clientes/perfil";
import estilos from "../formulario.module.css";
import ind from "./indicadores.module.css";

/** Período dos indicadores: últimos 7 dias, um mês (padrão), datas ou últimos 12 meses. */
export function EscolherPeriodo({ periodo, hoje }: { periodo: Periodo; hoje: string }) {
  const [tipo, setTipo] = useState(periodo.tipo);
  return (
    <form method="get" role="search" className={ind.periodo}>
      <label className={estilos.campo}>
        Período
        <select name="periodo" value={tipo} onChange={(e) => setTipo(e.target.value as Periodo["tipo"])}>
          <option value="semanal">Últimos 7 dias</option>
          <option value="mensal">Mês</option>
          <option value="periodo">Por datas</option>
          <option value="anual">Últimos 12 meses</option>
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
