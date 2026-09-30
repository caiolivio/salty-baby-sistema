import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarDataHora, formatarHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { podeAcessar } from "@/lib/permissoes";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { minutosRestantes } from "@/lib/pedidos/regras";
import { FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { cancelarPedido } from "../acoes";
import { ConfirmarPagamento } from "./confirmar";

export const metadata: Metadata = { title: "Pedido · Salty Baby" };

const NOMES = { reservado: "Reservado", expirado: "Reserva vencida", cancelado: "Cancelado", pago: "Pago" } as const;

export default async function PedidoNoPainel({ params, searchParams }: PageProps<"/painel/pedidos/[id]">) {
  const { id } = await params;
  const usuario = await exigirAcesso("painel", `/painel/pedidos/${id}`);
  const aviso = await searchParams;
  await liberarReservasVencidas();
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      itens: { orderBy: { ordem: "asc" }, include: { peca: { select: { id: true, codigo: true, nome: true, tamanho: true, status: true } } } },
      venda: { include: { itens: true } },
    },
  });
  if (!pedido) notFound();
  const administradora = podeAcessar(usuario.perfis, "painel-administracao");
  const aberto = pedido.status === "reservado" || pedido.status === "expirado";
  const itemVendido = (pecaId: string) => pedido.venda?.itens.find((i) => i.pecaId === pecaId);

  return (
    <>
      <p>
        <Link href="/painel/pedidos">← Pedidos</Link>
      </p>
      <h1 className={estilos.titulo}>
        Pedido nº {pedido.numero} · {pedido.nomeCliente}
      </h1>
      {aviso.pago && (
        <p className={proprios.aviso} role="status">
          Pagamento confirmado. A venda foi gravada e as peças saíram da vitrine.
        </p>
      )}
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
              {pedido.venda && administradora && (
                <>
                  <th className={estilos.numero}>Pago</th>
                  <th className={estilos.numero}>Repasse</th>
                  <th className={estilos.numero}>Lucro</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((i) => {
              const vendido = itemVendido(i.pecaId);
              return (
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
                  {vendido && administradora && (
                    <>
                      <td className={estilos.numero} data-rotulo="Pago">
                        {formatarReais(vendido.valorPagoCentavos)}
                      </td>
                      <td className={estilos.numero} data-rotulo="Repasse">
                        {formatarReais(vendido.repasseCentavos)}
                      </td>
                      <td className={estilos.numero} data-rotulo="Lucro">
                        {formatarReais(vendido.lucroCentavos)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        Total do pedido: <strong>{formatarReais(pedido.totalCentavos)}</strong>
        {pedido.venda && pedido.venda.descontoCentavos > 0 && (
          <>
            {" · desconto "}
            {formatarReais(pedido.venda.descontoCentavos)}
            {" · pago "}
            <strong>{formatarReais(pedido.venda.totalCentavos)}</strong>
          </>
        )}
        {pedido.venda?.formaPagamento && ` · ${FORMAS_PAGAMENTO.find((f) => f.valor === pedido.venda?.formaPagamento)?.nome}`}
      </p>

      {aberto && administradora && <ConfirmarPagamento id={pedido.id} />}
      {aberto && !administradora && <p>Só a administradora pode confirmar o pagamento.</p>}
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
