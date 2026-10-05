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
import { restrito, valoresDoPedido } from "@/lib/cupons/regras";
import { opcoesDeSaldo } from "@/lib/fornecedoras/saldo-para-compras";
import proprios from "../../../formulario.module.css";
import estilos from "../../../painel.module.css";
import { cancelarPedido } from "../../acoes";
import { ConfirmarPagamento } from "../formulario-confirmar";
import { Voltar } from "@/componentes/voltar";

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
      cupom: { select: { porContaDaLoja: true, marca: true, tamanho: true, genero: true, fornecedoraId: true } },
      itens: {
        orderBy: { ordem: "asc" },
        include: {
          promocao: { select: { nome: true, porContaDaLoja: true } },
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
  // O saldo das fornecedoras é repasse: só para quem vê os valores.
  const saldos = valores ? await opcoesDeSaldo(pedido.creditoFornecedoraId) : [];
  const pediuSaldo = saldos.find((f) => f.id === pedido.creditoFornecedoraId);

  return (
    <>
      <p>
        <Voltar href="/painel/pedidos">Pedidos</Voltar>
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
        <p>
          A reserva venceu e as peças voltaram para a vitrine. Se a cliente pagou, ainda dá para confirmar enquanto as peças estiverem à
          venda.
        </p>
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
                  {formatarReais(i.precoCentavos - i.descontoCentavos)}
                  {i.descontoCentavos > 0 && <span className={estilos.antigo}>Promoção · antes {formatarReais(i.precoCentavos)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pedido.cupomCodigo && pedido.descontoCupomCentavos > 0 && (
        <p>
          Cupom {pedido.cupomCodigo}: −{formatarReais(pedido.descontoCupomCentavos)} (já preenchido nos descontos abaixo)
        </p>
      )}
      <p>
        Total do pedido: <strong>{formatarReais(pedido.totalCentavos)}</strong>
      </p>

      {pedido.naSacolinha && (
        <p className={proprios.aviso} role="status">
          A cliente escolheu &quot;Colocar na sacolinha&quot; (pagar agora e receber depois). &quot;Guardar na sacolinha&quot; já vem
          marcado.{!pedido.clienteId && " Antes de confirmar, ligue o pedido a uma cliente do cadastro na página do pedido."}
        </p>
      )}
      {pediuSaldo && (
        <p className={proprios.aviso} role="status">
          A cliente é a fornecedora {pediuSaldo.rotulo} e pediu para pagar com o saldo dela (disponível:{" "}
          {formatarReais(pediuSaldo.disponivelCentavos)}). Confira o valor em “Pagar com o saldo de uma fornecedora”.
        </p>
      )}
      {aberto && (
        <ConfirmarPagamento
          id={pedido.id}
          mostrarValores={valores}
          saldos={saldos}
          saldoPedido={pedido.creditoFornecedoraId}
          // O desconto das promoções já vem preenchido em cada peça.
          iniciais={{
            // A cliente escolheu "Colocar na sacolinha" no site.
            ...(pedido.naSacolinha ? { destino: "na_sacolinha" } : {}),
            ...valoresDoPedido(
            pedido.itens.map((i) => ({
              pecaId: i.pecaId,
              promocao:
                i.descontoCentavos > 0
                  ? {
                      descontoCentavos: i.descontoCentavos,
                      porContaDaLoja: i.promocao?.porContaDaLoja ?? false,
                      nome: i.promocao?.nome ?? "promoção",
                    }
                  : null,
              descontoCupomCentavos: i.descontoCupomCentavos,
            })),
            pedido.cupomCodigo && pedido.descontoCupomCentavos > 0
              ? {
                  codigo: pedido.cupomCodigo,
                  porContaDaLoja: pedido.cupom?.porContaDaLoja ?? false,
                  // Cupom excluído depois: usa a parte gravada em cada peça.
                  restrito: pedido.cupom ? restrito(pedido.cupom) : true,
                  descontoCentavos: pedido.descontoCupomCentavos,
                }
              : null,
          )}}
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
