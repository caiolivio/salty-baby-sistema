import "server-only";
import { prisma } from "../banco";
import { fimDaReserva } from "./regras";

/** Erro usado para desfazer a transação quando alguma peça já saiu. */
class PecasIndisponiveis extends Error {
  constructor(readonly ids: string[]) {
    super("peças indisponíveis");
  }
}

/**
 * Pedidos cuja reserva venceu: o pedido vira "expirado" e as peças voltam para
 * a vitrine. Roda sempre antes de mostrar a vitrine, o carrinho e os pedidos,
 * então não depende de uma tarefa agendada.
 */
export async function liberarReservasVencidas(agora = new Date()): Promise<number> {
  const vencidos = await prisma.pedido.findMany({
    where: { status: "reservado", reservadoAte: { lt: agora } },
    select: { id: true },
  });
  for (const { id } of vencidos) await encerrarPedido(id, "expirado");
  return vencidos.length;
}

/** Cancela (ou expira) um pedido reservado e devolve as peças à vitrine. */
export async function encerrarPedido(id: string, como: "expirado" | "cancelado"): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const mudou = await tx.pedido.updateMany({
      where: { id, status: "reservado" },
      data: { status: como },
    });
    if (mudou.count === 0) return false;
    await tx.peca.updateMany({
      where: { status: "reservada", itensPedido: { some: { pedidoId: id } } },
      data: { status: "publicada" },
    });
    return true;
  });
}

export type ResultadoFechar = { ok: true; id: string } | { ok: false; indisponiveis: string[] };

/**
 * Fecha o pedido: reserva cada peça (só se ainda estiver à venda) e cria o
 * pedido com o próximo número. Se alguma peça já tiver saído, nada é reservado.
 */
export async function fecharPedido(pecaIds: string[], nomeCliente: string, agora = new Date()): Promise<ResultadoFechar> {
  try {
    const id = await prisma.$transaction(async (tx) => {
      const pecas = await tx.peca.findMany({
        where: { id: { in: pecaIds } },
        select: { id: true, precoCentavos: true },
      });
      const faltando = pecaIds.filter((id) => !pecas.some((p) => p.id === id));
      const indisponiveis = [...faltando];
      for (const peca of pecas) {
        // A condição no próprio UPDATE impede que duas clientes reservem a mesma peça.
        const r = await tx.peca.updateMany({
          where: { id: peca.id, status: "publicada", quantidade: { gt: 0 } },
          data: { status: "reservada" },
        });
        if (r.count === 0) indisponiveis.push(peca.id);
      }
      if (indisponiveis.length > 0) throw new PecasIndisponiveis(indisponiveis);

      await tx.sequencia.upsert({
        where: { chave: "pedido" },
        create: { chave: "pedido", ultimo: 0 },
        update: {},
      });
      const { ultimo: numero } = await tx.sequencia.update({
        where: { chave: "pedido" },
        data: { ultimo: { increment: 1 } },
      });
      const pedido = await tx.pedido.create({
        data: {
          numero,
          nomeCliente,
          reservadoAte: fimDaReserva(agora),
          totalCentavos: pecas.reduce((soma, p) => soma + p.precoCentavos, 0),
          itens: {
            create: pecaIds.map((pecaId, ordem) => ({
              pecaId,
              ordem,
              precoCentavos: pecas.find((p) => p.id === pecaId)!.precoCentavos,
            })),
          },
        },
      });
      return pedido.id;
    });
    return { ok: true, id };
  } catch (erro) {
    if (erro instanceof PecasIndisponiveis) return { ok: false, indisponiveis: erro.ids };
    throw erro;
  }
}
