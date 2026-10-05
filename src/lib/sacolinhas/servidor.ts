import "server-only";
import { prisma } from "../banco";
import { formatarData } from "../datas";
import { formatarReais } from "../dinheiro";
import { registrar, registrarStatus, SELECAO_STATUS } from "../historico/gravar";
import type { Autor } from "../historico/regras";
import { lerLoja } from "../loja/servidor";
import { estaParaDoar, prazoDaSacolinha, SITUACOES_SACOLINHA, type Fechamento } from "./regras";

// Sacolinha no banco (regras em ./regras.ts). As peças guardadas têm o status
// "na_sacolinha" e o item da venda aponta para a sacolinha (itens_venda.sacolinha_id).

type Transacao = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type Resultado = { ok: true } | { ok: false; erro: string };

class Recusa extends Error {}

const dataDoDia = (aaaammdd: string) => new Date(`${aaaammdd}T00:00:00Z`);

/**
 * A sacolinha aberta da cliente, ou uma nova com o prazo contado de hoje.
 * Trava a ficha da cliente para duas vendas ao mesmo tempo não abrirem duas.
 */
export async function sacolinhaAberta(tx: Transacao, clienteId: string, hoje: string): Promise<string> {
  await tx.$queryRaw`SELECT id FROM clientes WHERE id = ${clienteId} FOR UPDATE`;
  const aberta = await tx.sacolinha.findFirst({
    where: { clienteId, situacao: "aberta" },
    orderBy: { abertaEm: "asc" },
    select: { id: true },
  });
  if (aberta) return aberta.id;
  const { mesesSacolinha } = await lerLoja();
  const nova = await tx.sacolinha.create({
    data: { clienteId, prazo: dataDoDia(prazoDaSacolinha(hoje, mesesSacolinha)) },
    select: { id: true },
  });
  return nova.id;
}

/** Guarda os itens de uma venda na sacolinha aberta da cliente. */
export async function guardarVendaNaSacolinha(tx: Transacao, vendaId: string, clienteId: string, hoje: string): Promise<void> {
  const sacolinhaId = await sacolinhaAberta(tx, clienteId, hoje);
  await tx.itemVenda.updateMany({ where: { vendaId }, data: { sacolinhaId } });
}

/**
 * Peça vendida que passa para "Na sacolinha" pela página da peça: entra na
 * sacolinha da cliente da última venda. Sem cliente, não dá.
 */
export async function guardarPecaNaSacolinha(tx: Transacao, pecaId: string, hoje: string): Promise<void> {
  const item = await tx.itemVenda.findFirst({
    where: { pecaId },
    orderBy: { venda: { criadoEm: "desc" } },
    select: { id: true, sacolinhaId: true, venda: { select: { clienteId: true } } },
  });
  if (!item?.venda.clienteId) {
    throw new Recusa("A venda desta peça não tem cliente, então não dá para guardar na sacolinha.");
  }
  if (item.sacolinhaId) {
    const atual = await tx.sacolinha.findUnique({ where: { id: item.sacolinhaId }, select: { situacao: true } });
    if (atual?.situacao === "aberta" || atual?.situacao === "envio_pedido") return;
  }
  const sacolinhaId = await sacolinhaAberta(tx, item.venda.clienteId, hoje);
  await tx.itemVenda.update({ where: { id: item.id }, data: { sacolinhaId } });
}

/** Peça que sai de "Na sacolinha" de volta para "Vendida" sai também da sacolinha. */
export async function tirarPecaDaSacolinha(tx: Transacao, pecaId: string): Promise<void> {
  await tx.itemVenda.updateMany({
    where: { pecaId, sacolinha: { situacao: { in: ["aberta", "envio_pedido"] } } },
    data: { sacolinhaId: null },
  });
}

export { Recusa as RecusaDaSacolinha };

async function comRecusa(fazer: (tx: Transacao) => Promise<void>): Promise<Resultado> {
  try {
    await prisma.$transaction(fazer);
    return { ok: true };
  } catch (erro) {
    if (erro instanceof Recusa) return { ok: false, erro: erro.message };
    throw erro;
  }
}

async function lerParaMudar(tx: Transacao, id: string) {
  const sacolinha = await tx.sacolinha.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true } },
      itens: { select: { peca: { select: SELECAO_STATUS } } },
    },
  });
  if (!sacolinha) throw new Recusa("Esta sacolinha não existe mais.");
  return sacolinha;
}

const registroDaCliente = (c: { id: string; nome: string }) => ({ tabela: "cliente" as const, id: c.id, rotulo: c.nome });

/**
 * A cliente (ou a loja, por ela) pede o envio: a sacolinha deixa de receber
 * peças e a próxima compra abre outra. `clienteId` confere que é dela.
 */
export async function pedirEnvio(id: string, autor: Autor, clienteId?: string): Promise<Resultado> {
  return comRecusa(async (tx) => {
    const sacolinha = await lerParaMudar(tx, id);
    if (clienteId && sacolinha.clienteId !== clienteId) throw new Recusa("Esta sacolinha não é sua.");
    if (sacolinha.situacao === "envio_pedido") return;
    if (sacolinha.situacao !== "aberta") throw new Recusa("Esta sacolinha já foi fechada.");
    if (!sacolinha.itens.some((i) => i.peca.status === "na_sacolinha")) throw new Recusa("A sacolinha está vazia.");
    await tx.sacolinha.update({ where: { id }, data: { situacao: "envio_pedido", envioPedidoEm: new Date() } });
    await registrar(
      tx,
      registroDaCliente(sacolinha.cliente),
      [{ campo: "Sacolinha", antes: SITUACOES_SACOLINHA.aberta, depois: SITUACOES_SACOLINHA.envio_pedido, restrito: false }],
      autor,
      clienteId ? "Envio pedido pela cliente no site" : "Envio pedido no painel",
    );
  });
}

/** Desfaz o pedido de envio (a cliente desistiu): a sacolinha volta a receber peças. */
export async function voltarParaAberta(id: string, autor: Autor): Promise<Resultado> {
  return comRecusa(async (tx) => {
    const sacolinha = await lerParaMudar(tx, id);
    if (sacolinha.situacao !== "envio_pedido") throw new Recusa("Só volta a ficar aberta uma sacolinha com envio pedido.");
    await tx.$queryRaw`SELECT id FROM clientes WHERE id = ${sacolinha.clienteId} FOR UPDATE`;
    const outra = await tx.sacolinha.count({ where: { clienteId: sacolinha.clienteId, situacao: "aberta" } });
    if (outra > 0) throw new Recusa("A cliente já tem outra sacolinha aberta (de uma compra depois do pedido de envio).");
    await tx.sacolinha.update({ where: { id }, data: { situacao: "aberta", envioPedidoEm: null } });
    await registrar(
      tx,
      registroDaCliente(sacolinha.cliente),
      [{ campo: "Sacolinha", antes: SITUACOES_SACOLINHA.envio_pedido, depois: SITUACOES_SACOLINHA.aberta, restrito: false }],
      autor,
      "Pedido de envio desfeito",
    );
  });
}

/**
 * Fecha a sacolinha: as peças guardadas viram "Enviada", "Retirada" ou "Doada".
 * Doar só depois do prazo vencido (lista "a doar"), e a loja confirma.
 */
export async function fecharSacolinha(
  id: string,
  como: Fechamento,
  autor: Autor,
  hoje: string,
  extra: { freteCentavos?: number | null; observacao?: string | null } = {},
): Promise<Resultado> {
  return comRecusa(async (tx) => {
    const sacolinha = await lerParaMudar(tx, id);
    if (sacolinha.situacao !== "aberta" && sacolinha.situacao !== "envio_pedido") throw new Recusa("Esta sacolinha já foi fechada.");
    if (como === "doada" && !estaParaDoar(sacolinha, hoje)) {
      throw new Recusa("Só dá para doar uma sacolinha aberta depois que o prazo venceu.");
    }
    const pecas = sacolinha.itens.map((i) => i.peca).filter((p) => p.status === "na_sacolinha");
    const mudou = await tx.peca.updateMany({
      where: { id: { in: pecas.map((p) => p.id) }, status: "na_sacolinha" },
      data: { status: como },
    });
    if (mudou.count !== pecas.length) throw new Recusa("Uma das peças mudou enquanto isso. Abra a sacolinha de novo.");
    const motivo = { enviada: "Sacolinha enviada", retirada: "Sacolinha retirada na loja", doada: "Sacolinha vencida doada" }[como];
    await registrarStatus(tx, pecas, { status: como }, autor, motivo);
    await tx.sacolinha.update({
      where: { id },
      data: {
        situacao: como,
        fechadaEm: new Date(),
        ...(extra.freteCentavos !== undefined ? { freteCentavos: extra.freteCentavos } : {}),
        ...(extra.observacao !== undefined ? { observacao: extra.observacao } : {}),
      },
    });
    const frete = como === "enviada" && extra.freteCentavos ? ` · frete ${formatarReais(extra.freteCentavos)}` : "";
    await registrar(
      tx,
      registroDaCliente(sacolinha.cliente),
      [{ campo: "Sacolinha", antes: SITUACOES_SACOLINHA[sacolinha.situacao], depois: `${SITUACOES_SACOLINHA[como]}${frete}`, restrito: false }],
      autor,
      motivo,
    );
  });
}

/** Muda o último dia para pedir o envio (só de sacolinha ainda não fechada). */
export async function mudarPrazo(id: string, prazo: string, autor: Autor): Promise<Resultado> {
  return comRecusa(async (tx) => {
    const sacolinha = await lerParaMudar(tx, id);
    if (sacolinha.situacao !== "aberta" && sacolinha.situacao !== "envio_pedido") throw new Recusa("Esta sacolinha já foi fechada.");
    const novo = dataDoDia(prazo);
    if (novo.getTime() === sacolinha.prazo.getTime()) return;
    await tx.sacolinha.update({ where: { id }, data: { prazo: novo } });
    await registrar(
      tx,
      registroDaCliente(sacolinha.cliente),
      [{ campo: "Prazo da sacolinha", antes: formatarData(sacolinha.prazo), depois: formatarData(novo), restrito: false }],
      autor,
      "Prazo da sacolinha mudado",
    );
  });
}

/** O aviso semanal foi mandado (tocou em "Enviar no WhatsApp" ou "Copiar texto"). */
export async function marcarAvisoEnviado(id: string): Promise<void> {
  await prisma.sacolinha.updateMany({ where: { id, situacao: "aberta" }, data: { ultimoAvisoEm: new Date() } });
}

/** Peças novas à venda nos últimos 7 dias num tamanho (para o aviso). */
export async function novidadesNoTamanho(tamanho: string, agora = new Date()): Promise<number> {
  return prisma.peca.count({
    where: {
      tamanho,
      status: "publicada",
      naoListada: false,
      quantidade: { gt: 0 },
      criadoEm: { gte: new Date(agora.getTime() - 7 * 86_400_000) },
    },
  });
}
