import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../banco";
import { hojeEmSaoPaulo } from "../pecas/dados";
import { melhorPromocao, type DadosDaPromocao, type PrecoDaPromocao, type RegraDaPromocao } from "./regras";

// Banco das promoções: o preço com desconto de cada peça e o cadastro.

type Cliente = Prisma.TransactionClient | typeof prisma;

const dia = (t: string) => new Date(`${t}T00:00:00Z`);
const texto = (d: Date) => d.toISOString().slice(0, 10);

const regraDe = (p: {
  id: string;
  nome: string;
  tipo: "reais" | "percentual";
  valor: number;
  inicio: Date;
  fim: Date;
  porContaDaLoja: boolean;
  ativa: boolean;
}): RegraDaPromocao => ({
  ...p,
  inicio: texto(p.inicio),
  fim: texto(p.fim),
});

/** Preço com promoção das peças que estão numa promoção valendo hoje (as outras ficam fora do mapa). */
export async function promocoesDasPecas(
  pecas: readonly { id: string; precoCentavos: number }[],
  db: Cliente = prisma,
  hoje = hojeEmSaoPaulo(),
): Promise<Map<string, PrecoDaPromocao>> {
  const mapa = new Map<string, PrecoDaPromocao>();
  if (pecas.length === 0) return mapa;
  const ligacoes = await db.promocaoPeca.findMany({
    where: { pecaId: { in: pecas.map((p) => p.id) }, promocao: { ativa: true, inicio: { lte: dia(hoje) }, fim: { gte: dia(hoje) } } },
    select: { pecaId: true, promocao: true },
  });
  for (const p of pecas) {
    const regras = ligacoes.filter((l) => l.pecaId === p.id).map((l) => regraDe(l.promocao));
    const melhor = melhorPromocao(p.precoCentavos, regras, hoje);
    if (melhor) mapa.set(p.id, melhor);
  }
  return mapa;
}

/** Condição do Prisma para "peça numa promoção valendo hoje" (filtro da vitrine). */
export function ondeEmPromocao(hoje = hojeEmSaoPaulo()) {
  return { promocoes: { some: { promocao: { ativa: true, inicio: { lte: dia(hoje) }, fim: { gte: dia(hoje) } } } } };
}

export async function listarPromocoes() {
  const lista = await prisma.promocao.findMany({
    orderBy: [{ fim: "desc" }, { criadoEm: "desc" }],
    include: { _count: { select: { pecas: true } } },
  });
  return lista.map((p) => ({ ...regraDe(p), pecas: p._count.pecas }));
}

export async function lerPromocaoDoBanco(id: string) {
  const p = await prisma.promocao.findUnique({
    where: { id },
    include: {
      pecas: {
        select: {
          peca: {
            select: {
              id: true,
              codigo: true,
              nome: true,
              tamanho: true,
              precoCentavos: true,
              status: true,
              naoListada: true,
              fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
            },
          },
        },
      },
    },
  });
  if (!p) return null;
  return {
    ...regraDe(p),
    quem: p.quem,
    pecas: p.pecas.map((x) => x.peca).sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true })),
  };
}

const dadosDoBanco = (d: DadosDaPromocao) => ({ ...d, inicio: dia(d.inicio), fim: dia(d.fim) });

export async function criarPromocao(d: DadosDaPromocao, quem: string) {
  const p = await prisma.promocao.create({ data: { ...dadosDoBanco(d), quem } });
  return p.id;
}

export async function salvarPromocao(id: string, d: DadosDaPromocao, quem: string) {
  await prisma.promocao.update({ where: { id }, data: { ...dadosDoBanco(d), quem } });
}

export async function excluirPromocao(id: string) {
  await prisma.promocao.delete({ where: { id } });
}

/** Põe na promoção as peças dos códigos (novo ou antigo). Devolve os códigos que não foram achados. */
export async function incluirPecas(id: string, codigos: string[]): Promise<{ incluidas: number; naoAchados: string[] }> {
  if (codigos.length === 0) return { incluidas: 0, naoAchados: [] };
  const pecas = await prisma.peca.findMany({
    where: { OR: [{ codigo: { in: codigos } }, { codigoAntigo: { in: codigos } }] },
    select: { id: true, codigo: true, codigoAntigo: true },
  });
  const achados = new Set(pecas.flatMap((p) => [p.codigo.toUpperCase(), p.codigoAntigo?.toUpperCase()]));
  const r = await prisma.promocaoPeca.createMany({ data: pecas.map((p) => ({ promocaoId: id, pecaId: p.id })), skipDuplicates: true });
  return { incluidas: r.count, naoAchados: codigos.filter((c) => !achados.has(c)) };
}

export async function tirarPeca(id: string, pecaId: string) {
  await prisma.promocaoPeca.deleteMany({ where: { promocaoId: id, pecaId } });
}
