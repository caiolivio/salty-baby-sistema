import "server-only";
import { prisma } from "../banco";
import { calcularTaxa, dozeMeses, type DadosDespesa, type FormaComTaxa, type Taxas } from "./regras";

// Banco do Financeiro: taxas de pagamento, taxa gravada em cada venda e despesas.

type Cliente = Pick<typeof prisma, "taxaPagamento">;

/** As taxas de hoje (sem cadastro, zero). */
export async function taxasAtuais(db: Cliente = prisma): Promise<Taxas> {
  const linhas = await db.taxaPagamento.findMany({ select: { forma: true, percentual: true } });
  return Object.fromEntries(linhas.map((l) => [l.forma, l.percentual]));
}

export async function salvarTaxas(taxas: Record<FormaComTaxa, number>, quem: string) {
  await prisma.$transaction(
    Object.entries(taxas).map(([forma, percentual]) =>
      prisma.taxaPagamento.upsert({
        where: { forma: forma as FormaComTaxa },
        create: { forma: forma as FormaComTaxa, percentual, quem },
        update: { percentual, quem },
      }),
    ),
  );
}

const intervaloDoMes = (mes: string) => {
  const [ano, m] = mes.split("-").map(Number);
  return { gte: new Date(Date.UTC(ano, m - 1, 1)), lt: new Date(Date.UTC(ano, m, 1)) };
};

/** Vendas e despesas dos 12 meses até o mês informado, para o resumo e a tabela dos meses. */
export async function dadosDoFinanceiro(mes: string) {
  const meses = dozeMeses(mes);
  const periodo = { gte: intervaloDoMes(meses[0]).gte, lt: intervaloDoMes(mes).lt };
  const [vendas, despesas] = await Promise.all([
    prisma.venda.findMany({
      where: { data: periodo },
      select: {
        data: true,
        totalCentavos: true,
        creditoCentavos: true,
        taxaCentavos: true,
        itens: {
          select: { repasseCentavos: true, custoCentavos: true, lucroCentavos: true, quantidade: true, peca: { select: { tipo: true } } },
        },
      },
    }),
    prisma.despesa.findMany({ where: { data: periodo }, select: { data: true, categoria: true, valorCentavos: true } }),
  ]);
  return {
    meses,
    vendas: vendas.map((v) => ({ ...v, itens: v.itens.map(({ peca, ...i }) => ({ ...i, tipo: peca.tipo })) })),
    despesas,
  };
}

export async function despesasDoMes(mes: string) {
  return prisma.despesa.findMany({ where: { data: intervaloDoMes(mes) }, orderBy: [{ data: "desc" }, { criadoEm: "desc" }] });
}

export async function criarDespesa(dados: DadosDespesa, autor: { usuarioId: string | null; nome: string }) {
  await prisma.despesa.create({
    data: {
      data: new Date(`${dados.data}T00:00:00Z`),
      descricao: dados.descricao,
      categoria: dados.categoria,
      valorCentavos: dados.valorCentavos,
      usuarioId: autor.usuarioId,
      quem: autor.nome,
    },
  });
}

export async function excluirDespesa(id: string) {
  await prisma.despesa.deleteMany({ where: { id } });
}

/** Vendas do mês no Pix ou no cartão, com a taxa de cada uma. */
export async function vendasComTaxa(mes: string) {
  return prisma.venda.findMany({
    where: { data: intervaloDoMes(mes), formaPagamento: { in: ["pix", "cartao"] } },
    orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    select: {
      id: true,
      data: true,
      formaPagamento: true,
      totalCentavos: true,
      creditoCentavos: true,
      taxaCentavos: true,
      taxaAjustada: true,
      origem: true,
      canal: true,
      cliente: { select: { nome: true } },
      _count: { select: { itens: true } },
    },
  });
}

/** Acerta à mão a taxa de uma venda (ex.: cartão de crédito parcelado, com taxa maior). */
export async function ajustarTaxa(vendaId: string, taxaCentavos: number) {
  await prisma.venda.updateMany({ where: { id: vendaId }, data: { taxaCentavos, taxaAjustada: true } });
}

/** Aplica as taxas de hoje às vendas do mês que não foram acertadas à mão. Devolve quantas mudaram. */
export async function aplicarTaxasNoMes(mes: string): Promise<number> {
  const taxas = await taxasAtuais();
  const vendas = await prisma.venda.findMany({
    where: { data: intervaloDoMes(mes), taxaAjustada: false },
    select: { id: true, formaPagamento: true, totalCentavos: true, creditoCentavos: true, taxaCentavos: true },
  });
  let mudaram = 0;
  for (const v of vendas) {
    const taxa = calcularTaxa({ forma: v.formaPagamento, totalCentavos: v.totalCentavos, creditoCentavos: v.creditoCentavos }, taxas);
    if (taxa === v.taxaCentavos) continue;
    await prisma.venda.update({ where: { id: v.id }, data: { taxaCentavos: taxa } });
    mudaram++;
  }
  return mudaram;
}
