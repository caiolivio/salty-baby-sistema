import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../banco";
import type { TabelaDoHistorico } from "./regras";

/** Alterações de um registro, mais novas primeiro. Quem não é administradora não vê as restritas. */
export async function historicoDoRegistro(tabela: TabelaDoHistorico, registroId: string, administradora: boolean, limite = 100) {
  return prisma.alteracao.findMany({
    where: { tabela, registroId, ...(administradora ? {} : { restrito: false }) },
    orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
    take: limite,
  });
}

export type FiltroDoHistorico = {
  busca?: string;
  tabela?: TabelaDoHistorico;
  campo?: string;
  /** aaaa-mm-dd, dias inteiros em São Paulo. */
  de?: string;
  ate?: string;
};

/** Início do dia em São Paulo (UTC−3, sem horário de verão desde 2019). */
const inicioDoDia = (dia: string) => new Date(`${dia}T03:00:00Z`);

export function filtroDoHistorico(f: FiltroDoHistorico): Prisma.AlteracaoWhereInput {
  const termo = f.busca?.trim();
  const ate = f.ate ? new Date(inicioDoDia(f.ate).getTime() + 24 * 60 * 60 * 1000) : undefined;
  return {
    ...(f.tabela ? { tabela: f.tabela } : {}),
    ...(f.campo ? { campo: f.campo } : {}),
    ...(f.de || ate ? { criadoEm: { ...(f.de ? { gte: inicioDoDia(f.de) } : {}), ...(ate ? { lt: ate } : {}) } } : {}),
    ...(termo ? { OR: [{ rotulo: { contains: termo } }, { quem: { contains: termo } }, { motivo: { contains: termo } }] } : {}),
  };
}

export async function buscarHistorico(f: FiltroDoHistorico, pagina: number, porPagina = 100) {
  const where = filtroDoHistorico(f);
  const [total, linhas] = await Promise.all([
    prisma.alteracao.count({ where }),
    prisma.alteracao.findMany({
      where,
      orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ]);
  return { total, linhas };
}
