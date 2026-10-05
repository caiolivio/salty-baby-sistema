import "server-only";
import { prisma } from "../banco";
import { lerTelefoneCliente } from "../pedidos/regras";
import { podeEntrarNaFila } from "./regras";

/** Entra na fila de uma peça reservada. Quem já foi avisada e entra de novo vai para o fim da fila. */
export async function entrarNaFila(clienteId: string, pecaId: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const peca = await prisma.peca.findUnique({ where: { id: pecaId }, select: { status: true } });
  if (!peca) return { ok: false, erro: "Peça não encontrada." };
  if (!podeEntrarNaFila(peca.status)) return { ok: false, erro: "Esta peça não está mais reservada." };
  // Quem já está no próprio pedido com a peça não precisa de fila.
  const noPedidoDela = await prisma.itemPedido.count({
    where: { pecaId, pedido: { clienteId, status: "reservado" } },
  });
  if (noPedidoDela > 0) return { ok: false, erro: "Esta peça já está reservada no seu pedido." };
  await prisma.filaDeEspera.upsert({
    where: { clienteId_pecaId: { clienteId, pecaId } },
    create: { clienteId, pecaId },
    update: { criadoEm: new Date(), avisadoEm: null },
  });
  return { ok: true };
}

export async function sairDaFila(clienteId: string, pecaId: string): Promise<void> {
  await prisma.filaDeEspera.deleteMany({ where: { clienteId, pecaId } });
}

/** A fila da peça, na ordem de entrada. */
export function filaDaPeca(pecaId: string) {
  return prisma.filaDeEspera.findMany({
    where: { pecaId },
    orderBy: { criadoEm: "asc" },
    select: { clienteId: true, criadoEm: true, avisadoEm: true, cliente: { select: { id: true, nome: true } } },
  });
}

/** As filas em que a cliente está, com a situação de cada peça. */
export function filasDaCliente(clienteId: string) {
  return prisma.filaDeEspera.findMany({
    where: { clienteId },
    orderBy: { criadoEm: "desc" },
    select: {
      criadoEm: true,
      avisadoEm: true,
      peca: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          status: true,
          quantidade: true,
          tamanho: true,
          precoCentavos: true,
          fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
          filaEspera: { select: { clienteId: true, criadoEm: true } },
        },
      },
    },
  });
}

/**
 * O que avisar agora: peças que voltaram para a venda e têm gente na fila que
 * ainda não foi avisada, com as clientes na ordem de entrada.
 */
export async function filasParaAvisar() {
  const entradas = await prisma.filaDeEspera.findMany({
    where: { avisadoEm: null, peca: { status: "publicada", quantidade: { gt: 0 } } },
    orderBy: { criadoEm: "asc" },
    select: {
      id: true,
      criadoEm: true,
      cliente: { select: { id: true, nome: true, telefone: true } },
      peca: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          tamanho: true,
          precoCentavos: true,
          fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
        },
      },
    },
  });
  const porPeca = new Map<string, { peca: (typeof entradas)[number]["peca"]; clientes: { entradaId: string; id: string; nome: string; telefone: string | null }[] }>();
  for (const e of entradas) {
    const grupo = porPeca.get(e.peca.id) ?? { peca: e.peca, clientes: [] };
    grupo.clientes.push({ entradaId: e.id, id: e.cliente.id, nome: e.cliente.nome, telefone: lerTelefoneCliente(e.cliente.telefone) ?? null });
    porPeca.set(e.peca.id, grupo);
  }
  return [...porPeca.values()];
}

/** "Enviar no WhatsApp" ou "Copiar texto": a cliente foi avisada de que a peça voltou. */
export async function marcarFilaAvisada(entradaId: string): Promise<void> {
  await prisma.filaDeEspera.updateMany({ where: { id: entradaId, avisadoEm: null }, data: { avisadoEm: new Date() } });
}
