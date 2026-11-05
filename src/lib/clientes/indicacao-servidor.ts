import "server-only";
import { prisma } from "../banco";
import { gerarCodigoDeIndicacao } from "./indicacao";

/** Código do link "Indique uma amiga" da cliente, criado na primeira vez que ela abre. */
export async function codigoDeIndicacaoDa(clienteId: string): Promise<string> {
  const atual = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { codigoIndicacao: true } });
  if (atual?.codigoIndicacao) return atual.codigoIndicacao;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigoDeIndicacao();
    try {
      const r = await prisma.cliente.updateMany({ where: { id: clienteId, codigoIndicacao: null }, data: { codigoIndicacao: codigo } });
      if (r.count === 1) return codigo;
      // Outra aba já criou.
      const criado = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { codigoIndicacao: true } });
      if (criado?.codigoIndicacao) return criado.codigoIndicacao;
    } catch {
      // Código repetido (muito raro): tenta outro.
    }
  }
  throw new Error("Não foi possível criar o código de indicação.");
}

/** Amigas que se cadastraram pelo link da cliente, com quantas compras cada uma fez. */
export async function indicadasPor(clienteId: string) {
  const amigas = await prisma.cliente.findMany({
    where: { indicadaPorId: clienteId },
    orderBy: { criadoEm: "desc" },
    select: { id: true, nome: true, criadoEm: true, _count: { select: { vendas: true } } },
  });
  return amigas.map((a) => ({ id: a.id, nome: a.nome, criadoEm: a.criadoEm, comprou: a._count.vendas > 0 }));
}
