import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RelatorioMensal } from "@/componentes/relatorio-mensal";
import { Voltar } from "@/componentes/voltar";
import { lerLoja } from "@/lib/loja/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerMes, mesFechado, relatorioDoMes } from "@/lib/relatorios/regras";
import { vendasDoRelatorio } from "@/lib/relatorios/servidor";
import estilos from "../../../loja.module.css";
import { exigirFornecedoraLiberada } from "../../liberada";

export const metadata: Metadata = { title: "Relatório do mês", robots: { index: false } };

export default async function RelatorioDaFornecedora({ params }: PageProps<"/fornecedora/relatorios/[mes]">) {
  const { mes: texto } = await params;
  const { fornecedora } = await exigirFornecedoraLiberada(`/fornecedora/relatorios/${texto}`);
  const mes = lerMes(texto);
  if (!mes || !mesFechado(mes, hojeEmSaoPaulo())) notFound();
  const [itens, loja] = await Promise.all([vendasDoRelatorio(fornecedora.id), lerLoja()]);
  const relatorio = relatorioDoMes(itens, mes);

  return (
    <>
      <p>
        <Voltar href="/fornecedora/relatorios">Relatórios</Voltar>
      </p>
      <p className="sobretitulo">
        {loja.nome} · {fornecedora.codigo}
      </p>
      <h1 className={estilos.tituloPagina}>Relatório de {relatorio.nome}</h1>
      <RelatorioMensal relatorio={relatorio} />
    </>
  );
}
