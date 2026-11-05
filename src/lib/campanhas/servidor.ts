import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../banco";
import { codigoDaCampanha, tamanhosDaCampanha, type DadosDaCampanha } from "./regras";

// Banco das campanhas de lançamento (tabela campanhas).

export type CampanhaLida = {
  id: string;
  nome: string;
  codigo: string;
  titulo: string;
  texto: string | null;
  tamanhos: ReturnType<typeof tamanhosDaCampanha>;
  faixa: string | null;
  ate: Date | null;
  cupom: string | null;
  ativa: boolean;
  quem: string;
  atualizadoEm: Date;
};

const lida = (c: Prisma.CampanhaGetPayload<object>): CampanhaLida => ({ ...c, tamanhos: tamanhosDaCampanha(c.tamanhos) });

/** A campanha ativa mais recente (a da faixa no alto do site), ou null. */
export const campanhaAtiva = cache(async (): Promise<CampanhaLida | null> => {
  try {
    const c = await prisma.campanha.findFirst({ where: { ativa: true }, orderBy: { atualizadoEm: "desc" } });
    return c ? lida(c) : null;
  } catch (erro) {
    // No build não há banco: o site segue sem faixa.
    console.error("Não foi possível ler a campanha:", erro);
    return null;
  }
});

export async function campanhaPeloCodigo(codigo: string): Promise<CampanhaLida | null> {
  const c = await prisma.campanha.findUnique({ where: { codigo: codigoDaCampanha(codigo) } });
  return c ? lida(c) : null;
}

export async function listarCampanhas(): Promise<CampanhaLida[]> {
  return (await prisma.campanha.findMany({ orderBy: [{ ativa: "desc" }, { atualizadoEm: "desc" }] })).map(lida);
}

export async function lerCampanhaDoBanco(id: string): Promise<CampanhaLida | null> {
  const c = await prisma.campanha.findUnique({ where: { id } });
  return c ? lida(c) : null;
}

/** Peças da página da campanha: à venda (inclusive "Não listado"), nos tamanhos dela. */
export function ondeNaCampanha(c: Pick<CampanhaLida, "tamanhos">): Prisma.PecaWhereInput {
  return { status: "publicada", quantidade: { gt: 0 }, tamanho: { in: [...c.tamanhos] } };
}

/** Cria ou salva. Recusa um endereço que já é de outra campanha. Só uma fica ativa por vez. */
export async function gravarCampanha(id: string | null, dados: DadosDaCampanha, quem: string): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const repetida = await prisma.campanha.findUnique({ where: { codigo: dados.codigo }, select: { id: true } });
  if (repetida && repetida.id !== id) return { ok: false, erro: `O endereço /c/${dados.codigo} já é de outra campanha.` };
  const valores = { ...dados, tamanhos: dados.tamanhos.join(","), ate: dados.ate ? new Date(dados.ate) : null, quem: quem.slice(0, 191) };
  return prisma.$transaction(async (tx) => {
    const salva = id ? await tx.campanha.update({ where: { id }, data: valores }) : await tx.campanha.create({ data: valores });
    if (salva.ativa) await tx.campanha.updateMany({ where: { ativa: true, id: { not: salva.id } }, data: { ativa: false } });
    return { ok: true as const, id: salva.id };
  });
}

export async function excluirCampanha(id: string): Promise<void> {
  await prisma.campanha.deleteMany({ where: { id } });
}
