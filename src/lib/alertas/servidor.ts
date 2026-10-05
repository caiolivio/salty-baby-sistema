import "server-only";
import { prisma } from "../banco";
import { lerTelefoneCliente } from "../pedidos/regras";
import { MAXIMO_DE_ALERTAS, mesmoAlerta, pecaAtende, type Alerta, type AlertaLido } from "./regras";

/** Peças à venda na vitrine (o que pode ser avisado). */
const A_VENDA = { status: "publicada", naoListada: false, quantidade: { gt: 0 } } as const;

const SELECAO_PECA = {
  id: true,
  codigo: true,
  nome: true,
  tamanho: true,
  genero: true,
  marca: true,
  precoCentavos: true,
  criadoEm: true,
  atualizadoEm: true,
  categorias: { select: { categoriaId: true } },
  fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
} as const;

export function alertasDaCliente(clienteId: string) {
  return prisma.alerta.findMany({ where: { clienteId }, orderBy: { criadoEm: "asc" } });
}

export async function criarAlerta(
  clienteId: string,
  alerta: AlertaLido,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (alerta.categoriaId && !(await prisma.categoria.findFirst({ where: { id: alerta.categoriaId, ativa: true } }))) {
    return { ok: false, erro: "Escolha uma categoria da lista." };
  }
  const existentes = await alertasDaCliente(clienteId);
  if (existentes.some((a) => mesmoAlerta(a, alerta))) return { ok: false, erro: "Você já tem um aviso igual a este." };
  if (existentes.length >= MAXIMO_DE_ALERTAS) {
    return { ok: false, erro: `Você pode ter até ${MAXIMO_DE_ALERTAS} avisos. Apague um para criar outro.` };
  }
  await prisma.alerta.create({ data: { clienteId, ...alerta } });
  return { ok: true };
}

export async function apagarAlerta(id: string, clienteId: string): Promise<void> {
  await prisma.alerta.deleteMany({ where: { id, clienteId } });
}

type PecaLida = Awaited<ReturnType<typeof pecasAVenda>>[number];

function pecasAVenda(desde?: Date) {
  return prisma.peca.findMany({
    where: {
      ...A_VENDA,
      ...(desde && { OR: [{ criadoEm: { gte: desde } }, { atualizadoEm: { gte: desde } }] }),
    },
    orderBy: { criadoEm: "desc" },
    take: 2000,
    select: SELECAO_PECA,
  });
}

const atende = (alertas: Alerta[], p: PecaLida) =>
  alertas.some((a) => pecaAtende(a, { ...p, categorias: p.categorias.map((c) => c.categoriaId) }));

/** Todas as peças à venda que combinam com algum alerta da cliente (para a página dela). */
export async function pecasDosAlertas(clienteId: string, limite = 48): Promise<PecaLida[]> {
  const alertas = await alertasDaCliente(clienteId);
  if (alertas.length === 0) return [];
  return (await pecasAVenda()).filter((p) => atende(alertas, p)).slice(0, limite);
}

/**
 * O que avisar agora: por cliente, as peças à venda que combinam com um alerta,
 * chegaram (ou mudaram) depois de o alerta ser criado e ainda não foram avisadas.
 */
export async function avisosPendentes(clienteId?: string) {
  const alertas = await prisma.alerta.findMany({
    where: clienteId ? { clienteId } : {},
    include: { cliente: { select: { id: true, nome: true, telefone: true } } },
  });
  if (alertas.length === 0) return [];
  const maisAntigo = new Date(Math.min(...alertas.map((a) => a.criadoEm.getTime())));
  const pecas = await pecasAVenda(maisAntigo);
  const clientes = [...new Set(alertas.map((a) => a.clienteId))];
  const avisadas = await prisma.avisoDeAlerta.findMany({
    where: { clienteId: { in: clientes }, pecaId: { in: pecas.map((p) => p.id) } },
    select: { clienteId: true, pecaId: true },
  });
  const jaAvisada = new Set(avisadas.map((a) => `${a.clienteId}:${a.pecaId}`));

  return clientes
    .map((id) => {
      const dela = alertas.filter((a) => a.clienteId === id);
      const novas = pecas.filter(
        (p) =>
          !jaAvisada.has(`${id}:${p.id}`) &&
          dela.some(
            (a) =>
              Math.max(p.criadoEm.getTime(), p.atualizadoEm.getTime()) >= a.criadoEm.getTime() &&
              pecaAtende(a, { ...p, categorias: p.categorias.map((c) => c.categoriaId) }),
          ),
      );
      const cliente = dela[0].cliente;
      return { cliente: { ...cliente, telefone: lerTelefoneCliente(cliente.telefone) }, alertas: dela, pecas: novas };
    })
    .filter((c) => c.pecas.length > 0)
    .sort((a, b) => b.pecas.length - a.pecas.length);
}

/** Marca as peças como avisadas para a cliente (não entram no próximo aviso). */
export async function marcarAvisadas(clienteId: string, pecaIds: string[]): Promise<void> {
  if (pecaIds.length === 0) return;
  await prisma.avisoDeAlerta.createMany({
    data: pecaIds.map((pecaId) => ({ clienteId, pecaId })),
    skipDuplicates: true,
  });
}

/** Quantas clientes pediram aviso de algo que esta peça atende (página da peça no painel). */
export async function clientesQueQueremEstaPeca(pecaId: string) {
  const peca = await prisma.peca.findUnique({ where: { id: pecaId }, select: SELECAO_PECA });
  if (!peca) return [];
  const alertas = await prisma.alerta.findMany({ include: { cliente: { select: { id: true, nome: true } } } });
  const vistos = new Map<string, { id: string; nome: string }>();
  for (const a of alertas) {
    if (pecaAtende(a, { ...peca, categorias: peca.categorias.map((c) => c.categoriaId) })) vistos.set(a.cliente.id, a.cliente);
  }
  return [...vistos.values()];
}
