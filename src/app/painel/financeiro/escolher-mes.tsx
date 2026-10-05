import proprios from "../formulario.module.css";
import estilos from "./financeiro.module.css";

/** Escolha do mês (recarrega a página com ?mes=aaaa-mm). */
export function EscolherMes({ mes, hoje }: { mes: string; hoje: string }) {
  return (
    <form method="get" role="search" className={estilos.mes}>
      <label className={proprios.campo}>
        Mês
        <input type="month" name="mes" defaultValue={mes} max={hoje.slice(0, 7)} required />
      </label>
      <button type="submit" className={proprios.botaoSecundario}>
        Ver
      </button>
    </form>
  );
}
