import estilos from "./passos.module.css";

export type SituacaoDoPasso = "feito" | "atual" | "pendente";

/** Linha de passos "01 > 02 > 03", com o passo atual em destaque. */
export function Passos({ nomes, situacoes }: { nomes: readonly string[]; situacoes: readonly SituacaoDoPasso[] }) {
  return (
    <ol className={estilos.passos} aria-label="Passos">
      {nomes.map((nome, i) => {
        const situacao = situacoes[i] ?? "pendente";
        return (
          <li key={nome} className={estilos[situacao]} aria-current={situacao === "atual" ? "step" : undefined}>
            <span className={estilos.numero} aria-hidden="true">
              {situacao === "feito" ? "✓" : String(i + 1).padStart(2, "0")}
            </span>
            <span className={estilos.nome}>
              <span className={estilos.escondido}>
                Passo {String(i + 1).padStart(2, "0")}
                {situacao === "feito" ? " (feito)" : situacao === "atual" ? " (você está aqui)" : ""}:{" "}
              </span>
              {nome}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
