import "server-only";
import { prisma } from "@/lib/banco";

export type OpcaoCategoria = { id: string; nome: string };

/**
 * Categorias para marcar no cadastro: as ativas, mais as que a peça já tem
 * (mesmo que tenham sido desativadas depois).
 */
export async function opcoesDeCategoria(jaMarcadas: string[] = []): Promise<OpcaoCategoria[]> {
  return prisma.categoria.findMany({
    where: { OR: [{ ativa: true }, { id: { in: jaMarcadas } }] },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });
}
