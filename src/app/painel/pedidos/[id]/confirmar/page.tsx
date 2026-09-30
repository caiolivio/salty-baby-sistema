import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarDataHora, formatarHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { podeAcessar } from "@/lib/permissoes";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { minutosRestantes } from "@/lib/pedidos/regras";
import proprios from "../../../formulario.module.css";
import estilos from "../../../painel.module.css";
import { cancelarPedido } from "../../acoes";
import { ConfirmarPagamento } from "../formulario-confirmar";

export const metadata: Metadata = { title: "Confirmar pagamento · Salty Baby" };

const NOMES = { reservado: "Reservado", expirado: "Reserva vencida", cancelado: "Cancelado", pago: "Pago" } as const;

/** Página enxuta para confirmar o pagamento direto da lista de pedidos. */
export default async function ConfirmarPedido({ params }: PageProps<"/painel/pedidos/[id]/confirmar">) {
  const { id } = await params;
  const usuario = await exigirAcesso("painel", `/painel/pedidos/${id}/confirmar`);
  await liberarReservasVencidas();
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      itens: { orderBy: { ordem: "asc" }, include: { peca: { select: { id: true, codigo: true, nome: true, tamanho: true, status: true } } } },
    },
  });
  if (!pedido) notFound();
  const administradora = podeAcessar(usuario.perfis, "painel-administracao");
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
