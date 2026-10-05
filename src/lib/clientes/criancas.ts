import "server-only";
import { prisma } from "../banco";
import type { DadosCrianca } from "./dados";

/**
 * Inclui (sem id) ou altera uma criança da cliente. O tamanho guarda a data em
 * que foi informado, para a criança "crescer" com o tempo nas sugestões.
 */
export async function gravarCriancaDaCliente(clienteId: string, id: string | undefined, dados: DadosCrianca): Promise<boolean> {
  const hoje = new Date();
  if (id) {
    const atual = await prisma.crianca.findFirst({ where: { id, clienteId }, select: { tamanho: true, tamanhoEm: true } });
    if (!atual) return false;
    const tamanhoEm = !dados.tamanho ? null : atual.tamanho === dados.tamanho ? atual.tamanhoEm : hoje;
    await prisma.crianca.update({ where: { id }, data: { ...dados, tamanhoEm } });
    return true;
  }
  await prisma.crianca.create({ data: { ...dados, clienteId, tamanhoEm: dados.tamanho ? hoje : null } });
  return true;
}

export async function removerCriancaDaCliente(clienteId: string, id: string): Promise<void> {
  await prisma.crianca.deleteMany({ where: { id, clienteId } });
}
