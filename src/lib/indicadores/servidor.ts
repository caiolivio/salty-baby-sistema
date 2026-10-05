import "server-only";
import { prisma } from "../banco";
import { STATUS_A_VENDA } from "../fornecedoras/saldos";

// Banco dos indicadores: vendas de um intervalo, primeira compra de cada
// cliente, estoque à venda e pedidos do site.

const dia = (t: string) => new Date(`${t}T00:00:00Z`);

export async function dadosDosIndicadores(de: string, ate: string) {
  const fimExclusivo = new Date(dia(ate).getTime() + 86_400_000);
  const [vendas, primeiras, pecas, pedidos] = await Promise.all([
    prisma.venda.findMany({
      where: { data: { gte: dia(de), lte: dia(ate) } },
      select: {
        data: true,
        totalCentavos: true,
        canal: true,
        grupo: true,
        formaPagamento: true,
        clienteId: true,
        itens: {
          select: {
            quantidade: true,
            valorPagoCentavos: true,
            lucroCentavos: true,
            peca: {
              select: {
                marca: true,
                tamanho: true,
                dataEntrada: true,
                categorias: { select: { categoria: { select: { nome: true } } } },
                fornecedora: { select: { codigo: true, nome: true } },
              },
            },
          },
        },
      },
    }),
    prisma.venda.groupBy({ by: ["clienteId"], where: { clienteId: { not: null } }, _min: { data: true } }),
    prisma.peca.findMany({
      where: { status: { in: [...STATUS_A_VENDA] }, quantidade: { gt: 0 } },
      select: { id: true, codigo: true, nome: true, precoCentavos: true, quantidade: true, dataEntrada: true },
    }),
    prisma.pedido.findMany({ where: { criadoEm: { gte: dia(de), lt: fimExclusivo } }, select: { status: true, criadoEm: true } }),
  ]);
  return {
    vendas: vendas.map((v) => ({
      ...v,
      itens: v.itens.map((i) => ({ ...i, peca: { ...i.peca, categorias: i.peca.categorias.map((c) => c.categoria.nome) } })),
    })),
    primeiraCompra: new Map(
      primeiras
        .filter((p) => p.clienteId && p._min.data)
        .map((p) => [p.clienteId as string, (p._min.data as Date).toISOString().slice(0, 10)]),
    ),
    pecas,
    pedidos,
  };
}
