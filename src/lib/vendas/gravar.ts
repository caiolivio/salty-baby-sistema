import "server-only";
import { prisma } from "../banco";
import { registrar, rotuloDaPeca } from "../historico/gravar";
import { mudancaDeStatus, type Autor, type Mudanca } from "../historico/regras";
import { calcularItens, type DadosConfirmacao, type DadosVendaDireta, type ItemCalculado } from "./regras";

export type ResultadoConfirmar = { ok: true; vendaId: string } | { ok: false; erro: string };

class Recusa extends Error {}

type Transacao = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const data = (aaaammdd: string) => new Date(`${aaaammdd}T00:00:00Z`);

/**
 * Tira cada peça do estoque (só se ainda estiver na situação esperada) e
 * calcula desconto, repasse e lucro de cada item.
 */
async function venderPecas(
  tx: Transacao,
  itens: { pecaId: string; precoCentavos: number }[],
  statusAceito: "publicada" | "reservada",
  dados: DadosConfirmacao,
  autor: Autor,
  motivo: string,
): Promise<ItemCalculado[]> {
  const pecas = await tx.peca.findMany({
    where: { id: { in: itens.map((i) => i.pecaId) } },
    select: {
      id: true,
      codigo: true,
      nome: true,
      status: true,
      naoListada: true,
      tipo: true,
      quantidade: true,
      percentualRepasse: true,
      custoCentavos: true,
      fornecedora: { select: { percentualRepassePadrao: true } },
    },
  });
  const lista = itens.map((item) => {
    const peca = pecas.find((p) => p.id === item.pecaId);
    if (!peca) throw new Recusa("Uma das peças não existe mais.");
    return { item, peca };
  });
  for (const { peca } of lista) {
    const sobra = Math.max(0, peca.quantidade - 1);
    const novoStatus = sobra > 0 ? "publicada" : dados.destino;
    // A condição no próprio UPDATE impede vender a mesma peça duas vezes.
    const r = await tx.peca.updateMany({
      where: { id: peca.id, status: statusAceito, quantidade: { gt: 0 } },
      data: { quantidade: sobra, status: novoStatus },
    });
    if (r.count === 0) throw new Recusa(`A peça ${peca.codigo} não está mais disponível.`);
    const mudancas: Mudanca[] = [];
    const status = mudancaDeStatus({ status: statusAceito, naoListada: peca.naoListada }, { status: novoStatus, naoListada: peca.naoListada });
    if (status) mudancas.push(status);
    if (sobra !== peca.quantidade) {
      mudancas.push({ campo: "Quantidade", antes: String(peca.quantidade), depois: String(sobra), restrito: false });
    }
    await registrar(tx, { tabela: "peca", id: peca.id, rotulo: rotuloDaPeca(peca) }, mudancas, autor, motivo);
  }
  return calcularItens(
    lista.map(({ item, peca }) => ({
      id: peca.id,
      tipo: peca.tipo,
      precoCentavos: item.precoCentavos,
      percentualRepasse: peca.percentualRepasse,
      percentualPadraoFornecedora: peca.fornecedora?.percentualRepassePadrao ?? null,
      custoCentavos: peca.custoCentavos,
    })),
    dados.descontoCentavos,
  );
}

/**
 * Confirma o pagamento de um pedido do site: grava a venda com repasse e lucro
 * de cada peça, tira as peças da vitrine e marca o pedido como pago. Um pedido
 * cuja reserva venceu também pode ser confirmado, se as peças ainda estiverem à venda.
 */
export async function confirmarPagamento(
  pedidoId: string,
  dados: DadosConfirmacao,
  hoje: string,
  autor: Autor,
): Promise<ResultadoConfirmar> {
  try {
    const vendaId = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: { itens: { orderBy: { ordem: "asc" } }, grupo: { select: { nome: true } } },
      });
      if (!pedido) throw new Recusa("Pedido não encontrado.");
      if (pedido.status !== "reservado" && pedido.status !== "expirado") {
        throw new Recusa(pedido.status === "pago" ? "Este pedido já foi pago." : "Este pedido foi cancelado.");
      }
      // Reservada por este pedido, ou de volta à venda depois que a reserva venceu.
      const statusAceito = pedido.status === "reservado" ? "reservada" : "publicada";
      const motivo = `Pedido nº ${pedido.numero} pago`;
      const itens = await venderPecas(tx, pedido.itens, statusAceito, dados, autor, motivo).catch((erro) => {
        throw erro instanceof Recusa ? new Recusa(`${erro.message} Tire a peça do pedido ou cancele o pedido.`) : erro;
      });
      const venda = await tx.venda.create({
        data: {
          data: data(hoje),
          canal: "site",
          // O pedido que veio pelo link do post conta para o grupo.
          grupoId: pedido.grupoId,
          grupo: pedido.grupo?.nome ?? null,
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

/**
 * Venda registrada direto no painel (WhatsApp, grupo, Instagram, loja ou Bag).
 * As peças precisam estar à venda; o preço é o atual de cada peça.
 */
export type ClienteDaVenda = { id: string } | { nova: { nome: string; telefone: string | null } } | null;

export async function registrarVendaDireta(
  pecaIds: string[],
  dados: DadosVendaDireta,
  cliente: ClienteDaVenda,
  autor: Autor,
): Promise<ResultadoConfirmar> {
  if (pecaIds.length === 0) return { ok: false, erro: "Inclua pelo menos uma peça na venda." };
  try {
    const vendaId = await prisma.$transaction(async (tx) => {
      const precos = await tx.peca.findMany({ where: { id: { in: pecaIds } }, select: { id: true, precoCentavos: true } });
      const itensDaVenda = pecaIds.map((pecaId) => ({
        pecaId,
        precoCentavos: precos.find((p) => p.id === pecaId)?.precoCentavos ?? 0,
      }));
      const subtotal = itensDaVenda.reduce((s, i) => s + i.precoCentavos, 0);
      if (dados.descontoCentavos > subtotal) throw new Recusa("O desconto não pode ser maior que o total.");
      const itens = await venderPecas(tx, itensDaVenda, "publicada", dados, autor, "Venda registrada no painel");
      // A nova cliente só entra no cadastro se a venda der certo.
      const clienteId = !cliente ? null : "id" in cliente ? cliente.id : (await tx.cliente.create({ data: cliente.nova })).id;
      const venda = await tx.venda.create({
        data: {
          data: data(dados.data),
          canal: dados.canal,
          grupo: dados.grupo,
          grupoId: dados.grupoId,
          clienteId,
          formaPagamento: dados.forma,
          subtotalCentavos: subtotal,
          descontoCentavos: dados.descontoCentavos,
          totalCentavos: subtotal - dados.descontoCentavos,
          itens: { create: itens },
        },
      });
      return venda.id;
    });
    return { ok: true, vendaId };
  } catch (erro) {
    if (erro instanceof Recusa) return { ok: false, erro: erro.message };
    throw erro;
  }
}
