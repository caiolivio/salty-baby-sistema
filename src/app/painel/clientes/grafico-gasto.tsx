import { formatarReais } from "@/lib/dinheiro";
import estilos from "./cliente.module.css";

type Barra = { chave: string; rotulo: string; totalCentavos: number; compras: number };

/** Barras com o valor gasto em cada dia ou mês. Passar o mouse (ou tocar) mostra o valor e as compras. */
export function GraficoGasto({ barras: meses, titulo }: { barras: Barra[]; titulo: string }) {
  const largura = 640;
  const altura = 180;
  const base = altura - 24;
  const topo = 20;
  const maior = Math.max(1, ...meses.map((m) => m.totalCentavos));
  const passo = largura / meses.length;
  const barra = Math.min(36, passo - 8);
  const indiceMaior = meses.findIndex((m) => m.totalCentavos === maior);
  // Com muitas barras (um mês por dia), mostra só alguns rótulos para não encavalar.
  const pulo = Math.ceil(meses.length / 12);

  return (
    <figure className={estilos.grafico}>
      <figcaption>{titulo}</figcaption>
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={titulo}>
        <line x1={0} x2={largura} y1={base} y2={base} className={estilos.eixo} />
        {meses.map((m, i) => {
          const h = m.totalCentavos === 0 ? 0 : Math.max(4, ((base - topo) * m.totalCentavos) / maior);
          const x = i * passo + (passo - barra) / 2;
          const texto = `${m.rotulo}: ${formatarReais(m.totalCentavos)} em ${m.compras} compra(s)`;
          return (
            <g key={m.chave} className={estilos.coluna}>
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
              {((i % pulo === 0 && meses.length - 1 - i >= pulo / 2) || i === meses.length - 1) && (
                <text
                  x={i === 0 ? x : i === meses.length - 1 ? x + barra : x + barra / 2}
                  y={altura - 6}
                  textAnchor={i === meses.length - 1 ? "end" : i === 0 ? "start" : "middle"}
                  className={estilos.mes}
                >
                  {m.rotulo}
                </text>
              )}
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
