import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirExtra } from "@/lib/acesso";
import { temExtra } from "@/lib/permissoes";
import { prisma } from "@/lib/banco";
import { formatarDataHora, formatarHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { minutosRestantes } from "@/lib/pedidos/regras";
import proprios from "../../../formulario.module.css";
import estilos from "../../../painel.module.css";
import { cancelarPedido } from "../../acoes";
import { ConfirmarPagamento } from "../formulario-confirmar";

export const metadata: Metadata = { title: "Confirmar pagamento" };

const NOMES = { reservado: "Reservado", expirado: "Reserva vencida", cancelado: "Cancelado", pago: "Pago" } as const;

/** Página enxuta para confirmar o pagamento direto da lista de pedidos. */
export default async function ConfirmarPedido({ params }: PageProps<"/painel/pedidos/[id]/confirmar">) {
  const { id } = await params;
  const { acesso } = await exigirExtra("confirmar_pagamento", `/painel/pedidos/${id}/confirmar`);
  const valores = temExtra(acesso, "valores");
  await liberarReservasVencidas();
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      itens: { orderBy: { ordem: "asc" }, include: {
          peca: {
            select: {
              id: true,
              codigo: true,
              nome: true,
              tamanho: true,
              status: true,
              tipo: true,
              percentualRepasse: true,
              custoCentavos: true,
              fornecedora: { select: { percentualRepassePadrao: true } },
            },
          },
        },
      },
    },
  });
  if (!pedido) notFound();
  const aberto = pedido.status === "reservado" || pedido.status === "expirado";
  if (!aberto) redirect(`/painel/pedidos/${id}`);

  return (
    <>
      <p>
        <Link href="/painel/pedidos">← Pedidos</Link>
        {" · "}
        <Link href={`/painel/pedidos/${pedido.id}`}>Ver detalhes e editar</Link>
      </p>
      <h1 className={estilos.titulo}>
        Pedido nº {pedido.numero} · {pedido.nomeCliente}
      </h1>
      <p>
        <strong>{NOMES[pedido.status]}</strong>
        {pedido.status === "reservado" &&
          ` até ${formatarHora(pedido.reservadoAte)} (faltam ${minutosRestantes(pedido.reservadoAte, new Date())} min)`}
        {" · feito em "}
        {formatarDataHora(pedido.criadoEm)}
      </p>
      {pedido.status === "expirado" && (
        <p>A reserva venceu e as peças voltaram para a vitrine. Se a cliente pagou, ainda dá para confirmar enquanto as peças estiverem à venda.</p>
      )}

      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Peça</th>
              <th className={estilos.numero}>Preço</th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((i) => (
                <tr key={i.pecaId}>
                  <td className={estilos.curta}>
                    <Link href={`/painel/pecas/${i.peca.id}`} className={estilos.codigo}>
                      {i.peca.codigo}
                    </Link>
                  </td>
                  <td>
                    {i.peca.nome}
                    {i.peca.tamanho && <span className={estilos.antigo}>Tam. {i.peca.tamanho}</span>}
                  </td>
                  <td className={estilos.numero} data-rotulo="Preço">
                    {formatarReais(i.precoCentavos)}
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Total do pedido: <strong>{formatarReais(pedido.totalCentavos)}</strong>
      </p>

      {aberto && (
        <ConfirmarPagamento
          id={pedido.id}
          mostrarValores={valores}
          pecas={pedido.itens.map((i) => ({
            id: i.pecaId,
            codigo: i.peca.codigo,
            nome: i.peca.nome,
            precoCentavos: i.precoCentavos,
            loja: i.peca.tipo === "loja",
            // Custo e repasse só vão ao navegador de quem pode ver.
            percentualRepasse: valores ? (i.peca.percentualRepasse ?? i.peca.fornecedora?.percentualRepassePadrao ?? null) : null,
            custoCentavos: valores ? i.peca.custoCentavos : null,
          }))}
        />
      )}
      {pedido.status === "reservado" && (
        <form action={cancelarPedido}>
          <input type="hidden" name="id" value={pedido.id} />
          <button type="submit" className={proprios.botaoSecundario}>
            Cancelar e liberar peças
          </button>
        </form>
      )}
    </>
  );
}
