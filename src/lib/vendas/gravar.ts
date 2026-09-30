import "server-only";
import { prisma } from "../banco";
import { calcularItens, type DadosConfirmacao } from "./regras";

export type ResultadoConfirmar = { ok: true; vendaId: string } | { ok: false; erro: string };

class Recusa extends Error {}

const data = (aaaammdd: string) => new Date(`${aaaammdd}T00:00:00Z`);

/**
 * Confirma o pagamento de um pedido do site: grava a venda com repasse e lucro
 * de cada peça, tira as peças da vitrine e marca o pedido como pago. Um pedido
 * cuja reserva venceu também pode ser confirmado, se as peças ainda estiverem à venda.
 */
export async function confirmarPagamento(pedidoId: string, dados: DadosConfirmacao, hoje: string): Promise<ResultadoConfirmar> {
  try {
    const vendaId = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: {
          itens: {
            orderBy: { ordem: "asc" },
            include: {
              peca: {
                select: {
                  id: true,
                  codigo: true,
                  tipo: true,
                  quantidade: true,
                  percentualRepasse: true,
                  custoCentavos: true,
                  fornecedora: { select: { percentualRepassePadrao: true } },
                },
              },
            },
          },
        },
      });
      if (!pedido) throw new Recusa("Pedido não encontrado.");
      if (pedido.status !== "reservado" && pedido.status !== "expirado") {
        throw new Recusa(pedido.status === "pago" ? "Este pedido já foi pago." : "Este pedido foi cancelado.");
      }
      // Reservada por este pedido, ou de volta à venda depois que a reserva venceu.
      const statusAceito = pedido.status === "reservado" ? "reservada" : "publicada";
      for (const item of pedido.itens) {
        const sobra = item.peca.quantidade - 1;
        const r = await tx.peca.updateMany({
          where: { id: item.pecaId, status: statusAceito, quantidade: { gt: 0 } },
          data: { quantidade: Math.max(0, sobra), status: sobra > 0 ? "publicada" : dados.destino },
        });
        if (r.count === 0) throw new Recusa(`A peça ${item.peca.codigo} não está mais disponível. Cancele o pedido.`);
      }

      const itens = calcularItens(
        pedido.itens.map((i) => ({
          id: i.pecaId,
          tipo: i.peca.tipo,
          precoCentavos: i.precoCentavos,
          percentualRepasse: i.peca.percentualRepasse,
          percentualPadraoFornecedora: i.peca.fornecedora?.percentualRepassePadrao ?? null,
          custoCentavos: i.peca.custoCentavos,
        })),
        dados.descontoCentavos,
      );
      const venda = await tx.venda.create({
        data: {
          data: data(hoje),
          canal: "site",
          clienteId: pedido.clienteId,
          formaPagamento: dados.forma,
          subtotalCentavos: pedido.totalCentavos,
          descontoCentavos: dados.descontoCentavos,
          totalCentavos: pedido.totalCentavos - dados.descontoCentavos,
          origem: `Pedido nº ${pedido.numero} do site · ${pedido.nomeCliente}`,
          itens: { create: itens },
        },
      });
      await tx.pedido.update({ where: { id: pedido.id }, data: { status: "pago", vendaId: venda.id } });
      return venda.id;
    });
    return { ok: true, vendaId };
  } catch (erro) {
    if (erro instanceof Recusa) return { ok: false, erro: erro.message };
    throw erro;
  }
}
