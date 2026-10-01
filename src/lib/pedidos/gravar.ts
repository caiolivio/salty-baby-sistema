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
export async function fecharPedido(
  pecaIds: string[],
  cliente: { nome: string; telefone: string; clienteId?: string | null },
  grupoId: string | null = null,
  agora = new Date(),
): Promise<ResultadoFechar> {
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
          nomeCliente: cliente.nome,
          telefoneCliente: cliente.telefone,
          // Cliente logada: o pedido já fica ligado à ficha dela (e a venda também).
          clienteId: cliente.clienteId ?? null,
          grupoId,
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

// Edição do pedido no painel, enquanto ele não foi pago nem cancelado.

export type ResultadoEdicao = { ok: true } | { ok: false; erro: string };

class Recusa extends Error {}

async function editar(pedidoId: string, mudar: (tx: Transacao, pedido: PedidoAberto) => Promise<void>): Promise<ResultadoEdicao> {
  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: pedidoId },
        select: { id: true, status: true, itens: { select: { pecaId: true, ordem: true } } },
      });
      if (!pedido) throw new Recusa("Pedido não encontrado.");
      if (pedido.status !== "reservado" && pedido.status !== "expirado") {
        throw new Recusa(pedido.status === "pago" ? "Este pedido já foi pago." : "Este pedido foi cancelado.");
      }
      await mudar(tx, { ...pedido, status: pedido.status });
      const itens = await tx.itemPedido.findMany({ where: { pedidoId }, select: { precoCentavos: true } });
      await tx.pedido.update({
        where: { id: pedidoId },
        data: { totalCentavos: itens.reduce((soma, i) => soma + i.precoCentavos, 0) },
      });
    });
    return { ok: true };
  } catch (erro) {
    if (erro instanceof Recusa) return { ok: false, erro: erro.message };
    throw erro;
  }
}

type Transacao = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type PedidoAberto = { id: string; status: "reservado" | "expirado"; itens: { pecaId: string; ordem: number }[] };

/** Tira uma peça do pedido. Se ela estava reservada por ele, volta para a vitrine. */
export function tirarPecaDoPedido(pedidoId: string, pecaId: string): Promise<ResultadoEdicao> {
  return editar(pedidoId, async (tx, pedido) => {
    if (!pedido.itens.some((i) => i.pecaId === pecaId)) throw new Recusa("Esta peça não está no pedido.");
    if (pedido.itens.length === 1) throw new Recusa("O pedido precisa de pelo menos uma peça. Para desistir dele, cancele.");
    await tx.itemPedido.delete({ where: { pedidoId_pecaId: { pedidoId, pecaId } } });
    if (pedido.status === "reservado") {
      await tx.peca.updateMany({ where: { id: pecaId, status: "reservada" }, data: { status: "publicada" } });
    }
  });
}

/**
 * Inclui uma peça à venda no pedido, pelo código novo ou antigo. Num pedido
 * reservado ela também fica reservada; se a reserva já venceu, só entra na lista.
 */
export function incluirPecaNoPedido(pedidoId: string, codigo: string): Promise<ResultadoEdicao> {
  return editar(pedidoId, async (tx, pedido) => {
    const peca = await tx.peca.findFirst({
      where: { OR: [{ codigo }, { codigoAntigo: codigo }] },
      select: { id: true, codigo: true, precoCentavos: true },
    });
    if (!peca) throw new Recusa(`Nenhuma peça com o código ${codigo}.`);
    if (pedido.itens.some((i) => i.pecaId === peca.id)) throw new Recusa(`A peça ${peca.codigo} já está no pedido.`);
    const aVenda = { id: peca.id, status: "publicada" as const, quantidade: { gt: 0 } };
    const disponivel =
      pedido.status === "reservado"
        ? (await tx.peca.updateMany({ where: aVenda, data: { status: "reservada" } })).count > 0
        : (await tx.peca.count({ where: aVenda })) > 0;
    if (!disponivel) throw new Recusa(`A peça ${peca.codigo} não está à venda agora.`);
    await tx.itemPedido.create({
      data: {
        pedidoId,
        pecaId: peca.id,
        ordem: Math.max(-1, ...pedido.itens.map((i) => i.ordem)) + 1,
        precoCentavos: peca.precoCentavos,
      },
    });
  });
}
