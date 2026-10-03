import { Package, PiggyBank, TrendingUp } from "lucide-react";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import type { RelatorioDoMes } from "@/lib/relatorios/regras";
import estilos from "./relatorio-mensal.module.css";

/** Relatório mensal da fornecedora: o mesmo na área dela e no painel. Só as vendas do mês. */
export function RelatorioMensal({ relatorio: r }: { relatorio: RelatorioDoMes }) {
  const diferenca = r.repasseCentavos - r.repasseMesAnteriorCentavos;
  const maior = Math.max(1, ...r.barras.map((b) => b.repasseCentavos));
  return (
    <article className={estilos.relatorio} aria-label={`Relatório de ${r.nome}`}>
      <div className={estilos.numeros}>
        <div>
          <Package className="icone" aria-hidden />
          <span>Peças vendidas</span>
          <strong>{r.pecas}</strong>
        </div>
        <div>
          <TrendingUp className="icone" aria-hidden />
          <span>Valor das vendas</span>
          <strong>{formatarReais(r.vendidoCentavos)}</strong>
          {r.descontoCentavos > 0 && <small>com {formatarReais(r.descontoCentavos)} de descontos</small>}
        </div>
        <div className={estilos.destaque}>
          <PiggyBank className="icone" aria-hidden />
          <span>Seu repasse</span>
          <strong>{formatarReais(r.repasseCentavos)}</strong>
          {r.repasseMesAnteriorCentavos > 0 && (
            <small>
              {diferenca === 0
                ? "igual ao mês anterior"
                : `${formatarReais(Math.abs(diferenca))} ${diferenca > 0 ? "a mais" : "a menos"} que no mês anterior`}
            </small>
          )}
        </div>
      </div>

      {r.pecas > 0 && (
        <figure className={estilos.grafico}>
          <figcaption>Seu repasse por semana</figcaption>
          <ul>
            {r.barras.map((b) => (
              <li key={b.chave}>
                <span className={estilos.semana}>{b.rotulo}</span>
                <span className={estilos.trilho} aria-hidden>
                  {b.repasseCentavos > 0 && <span style={{ width: `${Math.max(2, (100 * b.repasseCentavos) / maior)}%` }} />}
                </span>
                <span className={estilos.valorSemana}>
                  {formatarReais(b.repasseCentavos)}
                  <small>
                    {b.pecas} {b.pecas === 1 ? "peça" : "peças"}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </figure>
      )}

      <h3>Peças vendidas</h3>
      {r.itens.length === 0 ? (
        <p>Nenhuma venda neste mês.</p>
      ) : (
        <ul className={estilos.lista}>
          {r.itens.map((i) => (
            <li key={i.id}>
              <div>
                <strong>{i.peca.codigo}</strong> · {i.peca.nome}
                <br />
                <small>
                  {formatarData(i.data)} · vendida por {formatarReais(i.valorPagoCentavos)}
                  {i.quantidade > 1 && ` (${i.quantidade} unidades)`}
                  {i.descontoCentavos > 0 && `, com ${formatarReais(i.descontoCentavos)} de desconto`}
                </small>
              </div>
              <div className={estilos.valor}>
                <strong>{formatarReais(i.repasseCentavos)}</strong>
                <br />
                <small>{i.repasseRecebido ? "Pago" : "A receber"}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
