import "server-only";
import { prisma } from "@/lib/banco";

/** Categorias já usadas, para sugerir no campo e evitar grafias diferentes. */
export async function categoriasUsadas(): Promise<string[]> {
  const linhas = await prisma.peca.findMany({
    where: { categoria: { not: null } },
    distinct: ["categoria"],
    select: { categoria: true },
    orderBy: { categoria: "asc" },
  });
  return linhas.flatMap((l) => (l.categoria ? [l.categoria] : []));
}
