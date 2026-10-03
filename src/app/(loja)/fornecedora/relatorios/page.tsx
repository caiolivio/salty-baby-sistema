import type { Metadata } from "next";
import Link from "next/link";
import { formatarReais } from "@/lib/dinheiro";
import { lerLoja } from "@/lib/loja/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { mesesComVendas } from "@/lib/relatorios/regras";
import { vendasDoRelatorio } from "@/lib/relatorios/servidor";
import estilos from "../../loja.module.css";
import { exigirFornecedoraLiberada } from "../liberada";

export const metadata: Metadata = { title: "Relatórios", robots: { index: false } };

export default async function MeusRelatorios() {
  const { fornecedora } = await exigirFornecedoraLiberada("/fornecedora/relatorios");
  const [itens, loja] = await Promise.all([vendasDoRelatorio(fornecedora.id), lerLoja()]);
  const meses = mesesComVendas(itens, hojeEmSaoPaulo());

  return (
    <>
      <h1 className={estilos.tituloPagina}>Relatórios</h1>
      <p className={estilos.dica}>
        No dia 1 de cada mês fica pronto o relatório do mês que passou, com as peças que você vendeu, quanto ganhou e um gráfico. A{" "}
        {loja.nomeCurto} também manda o relatório pelo WhatsApp.
      </p>
      {meses.length === 0 ? (
        <p>Ainda não há relatórios. O primeiro aparece no dia 1 do mês seguinte à sua primeira venda.</p>
      ) : (
        <ul className={estilos.listaVendasArea}>
          {meses.map((m) => (
            <li key={m.mes}>
              <div>
                <Link href={`/fornecedora/relatorios/${m.mes}`}>
                  <strong>Relatório de {m.nome}</strong>
                </Link>
                <br />
                {m.pecas} {m.pecas === 1 ? "peça vendida" : "peças vendidas"}
              </div>
              <div className={estilos.numero}>
                <strong>{formatarReais(m.repasseCentavos)}</strong>
                <br />
                <small>seu repasse</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
