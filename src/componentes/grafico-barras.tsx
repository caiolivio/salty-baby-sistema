import { formatarReais } from "@/lib/dinheiro";
import estilos from "./grafico-barras.module.css";

export type BarraDoGrafico = { chave: string; rotulo: string; valor: number };

/**
 * Barras simples (uma por dia ou mês). Passar o mouse ou tocar mostra o valor;
 * a maior barra leva o valor escrito, e a tabela abaixo mostra todos.
 */
export function GraficoBarras({
  barras,
  titulo,
  formato,
}: {
  barras: BarraDoGrafico[];
  titulo: string;
  formato: "reais" | "pecas";
}) {
  const largura = 640;
  const altura = 180;
  const base = altura - 24;
  const topo = 20;
  const mostrar = (v: number) => (formato === "reais" ? formatarReais(v) : `${v} peça${v === 1 ? "" : "s"}`);
  const maior = Math.max(1, ...barras.map((b) => b.valor));
  const passo = largura / Math.max(1, barras.length);
  const larguraBarra = Math.min(36, passo - 8);
  const indiceMaior = barras.findIndex((b) => b.valor === maior);
  const pulo = Math.ceil(barras.length / 12);
  const comValor = barras.filter((b) => b.valor > 0);

  return (
    <figure className={estilos.grafico}>
      <figcaption>{titulo}</figcaption>
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={titulo}>
        <line x1={0} x2={largura} y1={base} y2={base} className={estilos.eixo} />
        {barras.map((b, i) => {
          const h = b.valor === 0 ? 0 : Math.max(4, ((base - topo) * b.valor) / maior);
          const x = i * passo + (passo - larguraBarra) / 2;
          const ancora = i === barras.length - 1 ? "end" : i === 0 ? "start" : "middle";
          const xTexto = i === 0 ? x : i === barras.length - 1 ? x + larguraBarra : x + larguraBarra / 2;
          return (
            <g key={b.chave} className={estilos.coluna}>
              <title>{`${b.rotulo}: ${mostrar(b.valor)}`}</title>
              <rect x={i * passo} y={topo} width={passo} height={base - topo} fill="transparent" />
              {h > 0 && <path d={barraArredondada(x, base, larguraBarra, h)} className={estilos.barra} />}
              {i === indiceMaior && b.valor > 0 && (
                <text x={xTexto} y={base - h - 6} textAnchor={ancora} className={estilos.valor}>
                  {mostrar(b.valor)}
                </text>
              )}
              {((i % pulo === 0 && barras.length - 1 - i >= pulo / 2) || i === barras.length - 1) && (
                <text x={xTexto} y={altura - 6} textAnchor={ancora} className={estilos.mes}>
                  {b.rotulo}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {comValor.length > 0 && (
        <details className={estilos.tabela}>
          <summary>Ver em tabela</summary>
          <table>
            <tbody>
              {comValor.map((b) => (
                <tr key={b.chave}>
                  <td>{b.rotulo}</td>
                  <td>{mostrar(b.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}

/** Barra presa na base, com cantos de 4px só em cima. */
function barraArredondada(x: number, base: number, largura: number, altura: number): string {
  const r = Math.min(4, altura, largura / 2);
  const y = base - altura;
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + largura - r}Q${x + largura},${y} ${x + largura},${y + r}V${base}Z`;
}
