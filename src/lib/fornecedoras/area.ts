import "server-only";
import { prisma } from "../banco";
import { situacaoDaDevolucao } from "./saldos";

// Dados da área da fornecedora e pedidos de devolução.

/** Peças e itens vendidos da fornecedora, para os saldos e as listas. */
export async function dadosDaFornecedora(fornecedoraId: string) {
  const [pecas, itens] = await Promise.all([
    prisma.peca.findMany({
      where: { fornecedoraId },
      orderBy: [{ dataEntrada: "desc" }, { codigo: "desc" }],
      select: {
        id: true,
        codigo: true,
        nome: true,
        tamanho: true,
        status: true,
        naoListada: true,
        precoCentavos: true,
        quantidade: true,
        percentualRepasse: true,
        dataEntrada: true,
        fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
        devolucoes: { where: { situacao: "pedida" }, select: { pedidaEm: true } },
      },
    }),
    prisma.itemVenda.findMany({
      where: { peca: { fornecedoraId } },
      orderBy: [{ venda: { data: "desc" } }],
      select: {
        id: true,
        quantidade: true,
        valorPagoCentavos: true,
        repasseCentavos: true,
        repasseRecebido: true,
        repasseRecebidoEm: true,
        venda: { select: { data: true } },
        peca: { select: { codigo: true, nome: true } },
      },
    }),
  ]);
  return {
    pecas,
    itens: itens.map((i) => ({ ...i, data: i.venda.data })),
  };
}

/**
 * A fornecedora pede peças de volta. Só entram as dela, à venda ou em
 * rascunho, com 6 meses de entrada; cada uma sai da vitrine na hora.
 * Devolve quantas foram pedidas.
 */
export async function pedirDevolucao(fornecedoraId: string, pecaIds: string[], hoje: string): Promise<number> {
  let pedidas = 0;
  for (const pecaId of [...new Set(pecaIds)].slice(0, 500)) {
    const ok = await prisma.$transaction(async (tx) => {
      const peca = await tx.peca.findFirst({
        where: { id: pecaId, fornecedoraId },
        select: { status: true, naoListada: true, dataEntrada: true },
      });
      if (!peca || situacaoDaDevolucao(peca, hoje).tipo !== "pode") return false;
      // Só muda se o status ainda for o lido (uma cliente pode ter reservado agora).
      const mudou = await tx.peca.updateMany({
        where: { id: pecaId, status: peca.status },
        data: { status: "devolucao_pedida", naoListada: false },
      });
      if (mudou.count === 0) return false;
      await tx.devolucao.create({
        data: { pecaId, fornecedoraId, statusAnterior: peca.status, naoListadaAnterior: peca.naoListada },
      });
      return true;
    });
    if (ok) pedidas++;
  }
  return pedidas;
}

/** A Salty entregou a peça: ela fica como devolvida. */
export async function concluirDevolucao(id: string, agora = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const d = await tx.devolucao.findUnique({ where: { id }, select: { pecaId: true, situacao: true } });
    if (!d || d.situacao !== "pedida") return false;
    await tx.devolucao.update({ where: { id }, data: { situacao: "devolvida", concluidaEm: agora } });
    await tx.peca.updateMany({ where: { id: d.pecaId, status: "devolucao_pedida" }, data: { status: "devolvida" } });
    return true;
  });
}

/** A Salty cancela o pedido (por exemplo, combinado com a fornecedora): a peça volta como estava. */
export async function cancelarDevolucao(id: string, agora = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const d = await tx.devolucao.findUnique({ where: { id } });
    if (!d || d.situacao !== "pedida") return false;
    await tx.devolucao.update({ where: { id }, data: { situacao: "cancelada", concluidaEm: agora } });
    await tx.peca.updateMany({
      where: { id: d.pecaId, status: "devolucao_pedida" },
      data: { status: d.statusAnterior, naoListada: d.naoListadaAnterior },
    });
    return true;
  });
}
