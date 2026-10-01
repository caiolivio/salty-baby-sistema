"use client";

import { useState } from "react";
import type { Periodo } from "@/lib/clientes/perfil";
import estilos from "../loja.module.css";

/** Filtro do quadro de vendas: semanal, mensal, anual ou por período. Recarrega a página. */
export function EscolherPeriodo({ periodo, hoje }: { periodo: Periodo; hoje: string }) {
  const [tipo, setTipo] = useState(periodo.tipo);
  return (
    <form method="get" className={estilos.filtroPeriodo}>
      <label>
        Ver vendas
        <select name="periodo" value={tipo} onChange={(e) => setTipo(e.target.value as Periodo["tipo"])}>
          <option value="semanal">Semanal (últimos 7 dias)</option>
          <option value="mensal">Mensal</option>
          <option value="anual">Anual (últimos 12 meses)</option>
          <option value="periodo">Por período</option>
        </select>
      </label>
      {tipo === "mensal" && (
        <label>
          Mês
          <input type="month" name="mes" defaultValue={periodo.mes} max={hoje.slice(0, 7)} required />
        </label>
      )}
      {tipo === "periodo" && (
        <>
          <label>
            De
            <input type="date" name="de" defaultValue={periodo.tipo === "periodo" ? periodo.de : ""} max={hoje} required />
          </label>
          <label>
            Até
            <input type="date" name="ate" defaultValue={periodo.tipo === "periodo" ? periodo.ate : hoje} max={hoje} required />
          </label>
        </>
      )}
      <button type="submit" className={estilos.botaoContorno}>
        Ver
      </button>
    </form>
  );
}
