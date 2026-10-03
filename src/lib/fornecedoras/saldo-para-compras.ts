import "server-only";
import { prisma } from "../banco";
import { formatarReais } from "../dinheiro";
import { registrar, rotuloDaFornecedora } from "../historico/gravar";
import type { Autor } from "../historico/regras";
import { planoDeUso, saldoDeCredito, type SaldoDeCredito } from "./credito";

// Saldo para compras da fornecedora, lido do banco (regras em ./credito.ts).

type Cliente = Pick<typeof prisma, "itemVenda" | "movimentoCredito">;

/** Saldo de uma fornecedora: repasse ainda não pago, menos o usado, mais o bônus. */
export async function saldoParaCompras(fornecedoraId: string, banco: Cliente = prisma): Promise<SaldoDeCredito> {
  const [pendente, movimentos] = await Promise.all([
    banco.itemVenda.aggregate({
      where: {
        repasseRecebido: false,
        peca: { tipo: "consignada", fornecedoraId },
      },
      _sum: { repasseCentavos: true },
    }),
    banco.movimentoCredito.groupBy({
      by: ["fornecedoraId"],
      where: { fornecedoraId },
      _sum: { repasseCentavos: true, bonusCentavos: true },
    }),
  ]);
  const soma = movimentos[0]?._sum;
  return saldoDeCredito(pendente._sum.repasseCentavos ?? 0, [
    {
      repasseCentavos: soma?.repasseCentavos ?? 0,
      bonusCentavos: soma?.bonusCentavos ?? 0,
    },
  ]);
}

/** Saldo de várias fornecedoras de uma vez (para escolher no painel). */
export async function saldosParaCompras(): Promise<Map<string, SaldoDeCredito>> {
  const [pendentes, movimentos] = await Promise.all([
    prisma.itemVenda.findMany({
      where: {
        repasseRecebido: false,
        peca: { tipo: "consignada", fornecedoraId: { not: null } },
      },
      select: {
        repasseCentavos: true,
        peca: { select: { fornecedoraId: true } },
      },
    }),
    prisma.movimentoCredito.groupBy({
      by: ["fornecedoraId"],
      _sum: { repasseCentavos: true, bonusCentavos: true },
    }),
  ]);
  const porFornecedora = new Map<string, number>();
  for (const i of pendentes) {
    const id = i.peca.fornecedoraId as string;
    porFornecedora.set(id, (porFornecedora.get(id) ?? 0) + i.repasseCentavos);
  }
  const ids = new Set([...porFornecedora.keys(), ...movimentos.map((m) => m.fornecedoraId)]);
  const saldos = new Map<string, SaldoDeCredito>();
  for (const id of ids) {
    const pendente = porFornecedora.get(id) ?? 0;
    const m = movimentos.find((x) => x.fornecedoraId === id)?._sum;
    saldos.set(
      id,
      saldoDeCredito(pendente, [
        {
          repasseCentavos: m?.repasseCentavos ?? 0,
          bonusCentavos: m?.bonusCentavos ?? 0,
        },
      ]),
    );
  }
  return saldos;
}

type Transacao = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Tira um valor do saldo da fornecedora para pagar uma venda: grava a compra
 * (bônus e repasse usados) e, se ela usou todo o saldo a receber, o bônus de
 * 10%. A linha da fornecedora fica travada até o fim da transação, para duas
 * vendas ao mesmo tempo não gastarem o mesmo saldo. Devolve o erro, se houver.
 */
export async function gastarSaldo(
  tx: Transacao,
  credito: { fornecedoraId: string; valorCentavos: number },
  venda: { id: string; descricao: string },
  autor: Autor,
): Promise<string | null> {
  await tx.$queryRaw`SELECT id FROM fornecedoras WHERE id = ${credito.fornecedoraId} FOR UPDATE`;
  const fornecedora = await tx.fornecedora.findUnique({
    where: { id: credito.fornecedoraId },
    select: { id: true, codigo: true, nome: true },
  });
  if (!fornecedora) return "Fornecedora do saldo não encontrada.";
  const saldo = await saldoParaCompras(fornecedora.id, tx);
  const plano = planoDeUso(saldo, credito.valorCentavos);
  if (!plano.ok) return `${fornecedora.codigo} · ${fornecedora.nome}: ${plano.erro}`;
  const { bonusUsadoCentavos, repasseUsadoCentavos, bonusGanhoCentavos } = plano.uso;
  const quem = autor.nome.slice(0, 191);
  await tx.movimentoCredito.create({
    data: {
      fornecedoraId: fornecedora.id,
      tipo: "compra",
      repasseCentavos: -repasseUsadoCentavos,
      bonusCentavos: -bonusUsadoCentavos,
      vendaId: venda.id,
      descricao: `Compra: ${venda.descricao}`.slice(0, 191),
      quem,
    },
  });
  if (bonusGanhoCentavos > 0) {
    await tx.movimentoCredito.create({
      data: {
        fornecedoraId: fornecedora.id,
        tipo: "bonus",
        bonusCentavos: bonusGanhoCentavos,
        vendaId: venda.id,
        descricao: `Bônus de 10% por usar todo o saldo de ${formatarReais(repasseUsadoCentavos)}`.slice(0, 191),
        quem,
      },
    });
  }
  const partes = [`${formatarReais(credito.valorCentavos)} em ${venda.descricao}`];
  if (bonusUsadoCentavos > 0) partes.push(`${formatarReais(bonusUsadoCentavos)} do bônus`);
  if (bonusGanhoCentavos > 0) partes.push(`ganhou ${formatarReais(bonusGanhoCentavos)} de bônus`);
  await registrar(
    tx,
    {
      tabela: "fornecedora",
      id: fornecedora.id,
      rotulo: rotuloDaFornecedora(fornecedora),
    },
    [
      {
        campo: "Compra com o saldo",
        antes: null,
        depois: partes.join(" · "),
        restrito: true,
      },
    ],
    autor,
    "Compra com o saldo da fornecedora",
  );
  return null;
}

/** Fornecedoras com saldo para compras, para escolher no painel (mais a já pedida, se houver). */
export async function opcoesDeSaldo(incluir?: string | null) {
  const saldos = await saldosParaCompras();
  const ids = [...saldos].filter(([, s]) => s.disponivelCentavos > 0).map(([id]) => id);
  if (incluir && !ids.includes(incluir)) ids.push(incluir);
  if (ids.length === 0) return [];
  const fornecedoras = await prisma.fornecedora.findMany({ where: { id: { in: ids } }, select: { id: true, codigo: true, nome: true } });
  return fornecedoras
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }))
    .map((f) => {
      const s = saldos.get(f.id) ?? saldoDeCredito(0, []);
      return {
        id: f.id,
        rotulo: rotuloDaFornecedora(f),
        disponivelCentavos: s.disponivelCentavos,
        aReceberCentavos: s.aReceberCentavos,
        bonusCentavos: s.bonusCentavos,
      };
    });
}
