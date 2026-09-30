import "server-only";
import { prisma } from "@/lib/banco";

/** Grupos de WhatsApp em uso, na ordem da lista do painel. */
export function listarGruposEmUso() {
  return prisma.grupoWhatsapp.findMany({
    where: { ativo: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true, codigo: true, papel: true, ativo: true },
  });
}
