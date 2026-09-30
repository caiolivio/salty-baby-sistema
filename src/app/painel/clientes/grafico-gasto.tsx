import { formatarReais } from "@/lib/dinheiro";
import estilos from "./cliente.module.css";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const nomeDoMes = (aaaamm: string) => `${MESES[Number(aaaamm.slice(5, 7)) - 1]}/${aaaamm.slice(2, 4)}`;

/** Barras com o valor gasto em cada mês. Passar o mouse (ou tocar) mostra o valor e as compras. */
export function GraficoGasto({ meses }: { meses: { mes: string; totalCentavos: number; compras: number }[] }) {
  const largura = 640;
  const altura = 180;
  const base = altura - 24;
  const topo = 20;
  const maior = Math.max(1, ...meses.map((m) => m.totalCentavos));
  const passo = largura / meses.length;
  const barra = Math.min(36, passo - 8);
  const indiceMaior = meses.findIndex((m) => m.totalCentavos === maior);

  return (
    <figure className={estilos.grafico}>
      <figcaption>Gasto por mês (últimos 12 meses)</figcaption>
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Gráfico do valor gasto por mês">
        <line x1={0} x2={largura} y1={base} y2={base} className={estilos.eixo} />
        {meses.map((m, i) => {
          const h = m.totalCentavos === 0 ? 0 : Math.max(4, ((base - topo) * m.totalCentavos) / maior);
          const x = i * passo + (passo - barra) / 2;
          const texto = `${nomeDoMes(m.mes)}: ${formatarReais(m.totalCentavos)} em ${m.compras} compra(s)`;
          return (
            <g key={m.mes} className={estilos.coluna}>
              <title>{texto}</title>
              {/* Área de toque maior que a barra. */}
              <rect x={i * passo} y={topo} width={passo} height={base - topo} fill="transparent" />
              {h > 0 && <path d={barraArredondada(x, base, barra, h)} className={estilos.barra} />}
              {i === indiceMaior && m.totalCentavos > 0 && (
                <text
                  x={i === meses.length - 1 ? x + barra : i === 0 ? x : x + barra / 2}
                  y={base - h - 6}
                  textAnchor={i === meses.length - 1 ? "end" : i === 0 ? "start" : "middle"}
                  className={estilos.valor}
                >
                  {formatarReais(m.totalCentavos)}
                </text>
              )}
              <text x={x + barra / 2} y={altura - 6} textAnchor="middle" className={estilos.mes}>
                {nomeDoMes(m.mes)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Barra presa na base, com cantos de 4px só em cima. */
function barraArredondada(x: number, base: number, largura: number, altura: number): string {
  const r = Math.min(4, altura, largura / 2);
  const y = base - altura;
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + largura - r}Q${x + largura},${y} ${x + largura},${y + r}V${base}Z`;
}
