import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../banco";
import { hojeEmSaoPaulo } from "../pecas/dados";
import { aplicarCupom, type DadosDoCupom, type PecaDoCupom, type RegraDoCupom } from "./regras";

// Banco dos cupons: busca pelo código, usos, aplicação no carrinho e cadastro.

type Cliente = Prisma.TransactionClient | typeof prisma;

const dia = (t: string | null) => (t ? new Date(`${t}T00:00:00Z`) : null);
const texto = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

type LinhaDoCupom = Awaited<ReturnType<typeof prisma.cupom.findFirstOrThrow>>;
const regraDe = (c: LinhaDoCupom): RegraDoCupom => ({
  id: c.id,
  codigo: c.codigo,
  tipo: c.tipo,
  valor: c.valor,
  inicio: texto(c.inicio),
  fim: texto(c.fim),
  limiteUsos: c.limiteUsos,
  pedidoMinimoCentavos: c.pedidoMinimoCentavos,
  porContaDaLoja: c.porContaDaLoja,
  ativo: c.ativo,
  clienteId: c.clienteId,
  marca: c.marca,
  tamanho: c.tamanho,
  genero: c.genero,
  fornecedoraId: c.fornecedoraId,
});

/** Pedidos que usaram o cupom e ainda contam (reservados ou pagos). */
export async function usosDoCupom(id: string, db: Cliente = prisma) {
  return db.pedido.count({ where: { cupomId: id, status: { in: ["reservado", "pago"] } } });
}

/**
 * Aplica o cupom do código às peças (com os preços que a cliente paga, já com a
 * promoção). Usado no carrinho, para mostrar o desconto, e ao fechar o pedido.
 */
export async function cupomNoCarrinho(codigo: string, pecas: readonly PecaDoCupom[], clienteId: string | null, db: Cliente = prisma) {
  const linha = await db.cupom.findUnique({ where: { codigo } });
  const regra = linha ? regraDe(linha) : null;
  const usos = regra ? await usosDoCupom(regra.id, db) : 0;
  return aplicarCupom(regra, pecas, { hoje: hojeEmSaoPaulo(), clienteId, usos });
}

export async function listarCupons() {
  const [cupons, usos] = await Promise.all([
    prisma.cupom.findMany({ orderBy: [{ ativo: "desc" }, { criadoEm: "desc" }] }),
    prisma.pedido.groupBy({ by: ["cupomId"], where: { cupomId: { not: null }, status: { in: ["reservado", "pago"] } }, _count: true }),
  ]);
  const porCupom = new Map(usos.map((u) => [u.cupomId, u._count]));
  return cupons.map((c) => ({ ...regraDe(c), usos: porCupom.get(c.id) ?? 0 }));
}

export async function lerCupomDoBanco(id: string) {
  const c = await prisma.cupom.findUnique({
    where: { id },
    include: {
      pedidos: {
        orderBy: { criadoEm: "desc" },
        take: 100,
        select: { id: true, numero: true, nomeCliente: true, status: true, descontoCupomCentavos: true, criadoEm: true },
      },
    },
  });
  return c ? { ...regraDe(c), quem: c.quem, pedidos: c.pedidos } : null;
}

const paraOBanco = (d: DadosDoCupom) => ({ ...d, inicio: dia(d.inicio), fim: dia(d.fim) });

/** Cria ou salva o cupom. Recusa um código que já existe em outro cupom. */
export async function gravarCupom(
  id: string | null,
  d: DadosDoCupom,
  quem: string,
): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const outro = await prisma.cupom.findUnique({ where: { codigo: d.codigo }, select: { id: true } });
  if (outro && outro.id !== id) return { ok: false, erro: `Já existe um cupom com o código ${d.codigo}.` };
  if (id) {
    await prisma.cupom.update({ where: { id }, data: { ...paraOBanco(d), quem } });
    return { ok: true, id };
  }
  const c = await prisma.cupom.create({ data: { ...paraOBanco(d), quem } });
  return { ok: true, id: c.id };
}

/** Exclui o cupom; os pedidos que o usaram guardam o código e o desconto. */
export async function excluirCupom(id: string) {
  await prisma.cupom.delete({ where: { id } });
}
