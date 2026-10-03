import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { temExtra } from "@/lib/permissoes";
import { motivoParaNaoCorrigir, valoresDaVenda } from "@/lib/vendas/regras";
import estilos from "../../../painel.module.css";
import proprios from "../../../formulario.module.css";
import { FormularioCorrecao } from "./formulario-correcao";

export const metadata: Metadata = { title: "Corrigir venda" };

export default async function CorrigirVenda({ params }: PageProps<"/painel/vendas/[id]/corrigir">) {
  const { id } = await params;
  const { acesso } = await exigirPagina("vendas", "alterar", `/painel/vendas/${id}/corrigir`);
  const valores = temExtra(acesso, "valores");
  const venda = await prisma.venda.findUnique({
    where: { id },
    include: {
      cliente: { select: { nome: true } },
      creditoFornecedora: { select: { codigo: true, nome: true } },
      itens: { include: { peca: { select: { codigo: true, nome: true, tipo: true } } } },
    },
  });
  if (!venda) notFound();
  const bloqueio = motivoParaNaoCorrigir(venda.itens);
  const misto = venda.itens.some((i) => i.descontoPorConta === "misto");

  return (
    <>
      <p>
        <Link href="/painel/vendas">← Vendas</Link>
      </p>
      <h1 className={estilos.titulo}>Corrigir venda de {formatarData(venda.data)}</h1>
      <p>
        {venda.origem ?? venda.cliente?.nome ?? "Venda"} · total pago {formatarReais(venda.totalCentavos)}
        {venda.descontoCentavos > 0 && ` (desconto de ${formatarReais(venda.descontoCentavos)})`}
      </p>
      {venda.creditoFornecedora && venda.creditoCentavos > 0 && (
        <p>
          {formatarReais(venda.creditoCentavos)} foram pagos com o saldo de {venda.creditoFornecedora.codigo} · {venda.creditoFornecedora.nome}.
          Essa parte não muda na correção, então o total não pode ficar menor que ela.
        </p>
      )}
      {bloqueio ? (
        <p className={proprios.erro} role="alert">
          {bloqueio}
        </p>
      ) : (
        <>
          <p>
            Use para acertar uma venda confirmada com o valor, o desconto, a forma de pagamento ou a data errados. Os preços
            das peças e o % de repasse continuam os do dia da venda. A correção fica no histórico de cada peça.
          </p>
          {misto && (
            <p className={proprios.aviso} role="note">
              Esta venda tem desconto em parte por conta de cada um. Ele aparece abaixo como &quot;dividido&quot;: confira quem
              paga antes de salvar.
            </p>
          )}
          <FormularioCorrecao
            id={venda.id}
            hoje={hojeEmSaoPaulo()}
            mostrarValores={valores}
            iniciais={valoresDaVenda({
              formaPagamento: venda.formaPagamento,
              data: venda.data.toISOString().slice(0, 10),
              motivoDesconto: venda.motivoDesconto,
              itens: venda.itens,
            })}
            pecas={venda.itens.map((i) => ({
              id: i.pecaId,
              codigo: i.peca.codigo,
              nome: i.peca.nome,
              precoCentavos: i.precoUnitarioCentavos * i.quantidade,
              loja: i.peca.tipo === "loja",
              // O % e o custo gravados na venda, só para quem pode ver.
              percentualRepasse: valores ? i.percentualRepasse : null,
              custoCentavos: valores ? i.custoCentavos : null,
            }))}
          />
        </>
      )}
    </>
  );
}
