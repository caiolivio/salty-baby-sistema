import "server-only";
import { prisma } from "../banco";
import { lerLoja } from "../loja/servidor";
import { situacaoDaDevolucao } from "./saldos";
import { registrarStatus, SELECAO_STATUS } from "../historico/gravar";
import type { Autor } from "../historico/regras";

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
        precoUnitarioCentavos: true,
        descontoCentavos: true,
        descontoPorConta: true,
        percentualRepasse: true,
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
export async function pedirDevolucao(fornecedoraId: string, pecaIds: string[], hoje: string, autor: Autor): Promise<number> {
  let pedidas = 0;
  const { mesesDevolucao } = await lerLoja();
  for (const pecaId of [...new Set(pecaIds)].slice(0, 500)) {
    const ok = await prisma.$transaction(async (tx) => {
      const peca = await tx.peca.findFirst({
        where: { id: pecaId, fornecedoraId },
        select: { ...SELECAO_STATUS, dataEntrada: true },
      });
      if (!peca || situacaoDaDevolucao(peca, hoje, mesesDevolucao).tipo !== "pode") return false;
      // Só muda se o status ainda for o lido (uma cliente pode ter reservado agora).
      const mudou = await tx.peca.updateMany({
        where: { id: pecaId, status: peca.status },
        data: { status: "devolucao_pedida", naoListada: false },
      });
      if (mudou.count === 0) return false;
      await tx.devolucao.create({
        data: { pecaId, fornecedoraId, statusAnterior: peca.status, naoListadaAnterior: peca.naoListada },
      });
      await registrarStatus(tx, [peca], { status: "devolucao_pedida", naoListada: false }, autor, "Devolução pedida pela fornecedora");
      return true;
    });
    if (ok) pedidas++;
  }
  return pedidas;
}

/** A Salty entregou a peça: ela fica como devolvida. */
export async function concluirDevolucao(id: string, autor: Autor, agora = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const d = await tx.devolucao.findUnique({ where: { id }, select: { pecaId: true, situacao: true } });
    if (!d || d.situacao !== "pedida") return false;
    await tx.devolucao.update({ where: { id }, data: { situacao: "devolvida", concluidaEm: agora } });
    const peca = await tx.peca.findFirst({ where: { id: d.pecaId, status: "devolucao_pedida" }, select: SELECAO_STATUS });
    await tx.peca.updateMany({ where: { id: d.pecaId, status: "devolucao_pedida" }, data: { status: "devolvida" } });
    if (peca) await registrarStatus(tx, [peca], { status: "devolvida" }, autor, "Devolvida à fornecedora");
    return true;
  });
}

/** A Salty cancela o pedido (por exemplo, combinado com a fornecedora): a peça volta como estava. */
export async function cancelarDevolucao(id: string, autor: Autor, agora = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const d = await tx.devolucao.findUnique({ where: { id } });
    if (!d || d.situacao !== "pedida") return false;
    await tx.devolucao.update({ where: { id }, data: { situacao: "cancelada", concluidaEm: agora } });
    const peca = await tx.peca.findFirst({ where: { id: d.pecaId, status: "devolucao_pedida" }, select: SELECAO_STATUS });
    if (peca) {
      await registrarStatus(
        tx,
        [peca],
        { status: d.statusAnterior, naoListada: d.naoListadaAnterior },
        autor,
        "Pedido de devolução cancelado",
      );
    }
    await tx.peca.updateMany({
      where: { id: d.pecaId, status: "devolucao_pedida" },
      data: { status: d.statusAnterior, naoListada: d.naoListadaAnterior },
    });
    return true;
  });
}
