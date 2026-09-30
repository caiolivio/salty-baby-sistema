import "server-only";
import { prisma } from "../banco";
import type { PlanoImportacao } from "./notion";

const data = (aaaammdd: string) => new Date(`${aaaammdd}T00:00:00Z`);

export async function jaExistemDados(): Promise<boolean> {
  const [fornecedoras, pecas] = await Promise.all([prisma.fornecedora.count(), prisma.peca.count()]);
  return fornecedoras + pecas > 0;
}

/**
 * Grava tudo de uma vez: ou entra a importação inteira, ou nada. Só roda com o
 * banco vazio, para nunca duplicar peças nem misturar com dados novos.
 */
export async function gravarImportacao(plano: PlanoImportacao): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      if ((await tx.fornecedora.count()) + (await tx.peca.count()) > 0) {
        throw new Error("O banco já tem fornecedoras ou peças. A importação só roda uma vez.");
      }

      await tx.fornecedora.createMany({ data: plano.fornecedoras });
      const fornecedoras = new Map(
        (await tx.fornecedora.findMany({ select: { id: true, codigo: true } })).map((f) => [f.codigo, f.id]),
      );

      await tx.peca.createMany({
        data: plano.pecas.map((p) => ({
          codigo: p.codigo,
          codigoAntigo: p.codigoAntigo,
          nome: p.nome,
          tipo: p.tipo,
          fornecedoraId: p.codigoFornecedora ? fornecedoras.get(p.codigoFornecedora) : undefined,
          percentualRepasse: p.percentualRepasse,
          precoCentavos: p.precoCentavos,
          custoCentavos: p.custoCentavos,
          quantidade: p.quantidade,
          tamanho: p.tamanho,
          conservacao: p.conservacao,
          variacao: p.variacao,
          marca: p.marca,
          cor: p.cor,
          status: p.status,
          dataEntrada: data(p.dataEntrada),
        })),
      });
      const pecas = new Map((await tx.peca.findMany({ select: { id: true, codigo: true } })).map((p) => [p.codigo, p.id]));

      const clientes = new Map<string, string>();
      for (const c of plano.clientes) {
        const criado = await tx.cliente.create({ data: c, select: { id: true } });
        clientes.set(c.nome, criado.id);
      }

      for (const v of plano.vendas) {
        await tx.venda.create({
          data: {
            data: data(v.data),
            clienteId: v.cliente ? clientes.get(v.cliente) : undefined,
            canal: v.canal,
            formaPagamento: v.formaPagamento,
            subtotalCentavos: v.subtotalCentavos,
            descontoCentavos: v.descontoCentavos,
            totalCentavos: v.totalCentavos,
            origem: v.origem,
            itens: {
              create: v.itens.map((i) => ({
                pecaId: pecas.get(i.codigoPeca)!,
                quantidade: i.quantidade,
                precoUnitarioCentavos: i.precoUnitarioCentavos,
                descontoCentavos: i.descontoCentavos,
                valorPagoCentavos: i.valorPagoCentavos,
                percentualRepasse: i.percentualRepasse,
                repasseCentavos: i.repasseCentavos,
                custoCentavos: i.custoCentavos,
                lucroCentavos: i.lucroCentavos,
                repasseRecebido: i.repasseRecebido,
                repasseRecebidoEm: i.repasseRecebidoEm ? data(i.repasseRecebidoEm) : undefined,
              })),
            },
          },
        });
      }

      for (const [chave, ultimo] of Object.entries(plano.sequencias)) {
        await tx.sequencia.upsert({ where: { chave }, create: { chave, ultimo }, update: { ultimo } });
      }
    },
    { timeout: 60_000 },
  );
}

/** Só no site de teste (IMPORTACAO_PODE_APAGAR=sim): apaga tudo o que a importação cria. */
export function podeApagarImportacao(): boolean {
  return process.env.IMPORTACAO_PODE_APAGAR === "sim";
}

export async function apagarDadosImportados(): Promise<void> {
  if (!podeApagarImportacao()) throw new Error("Apagar a importação não é permitido neste site.");
  await prisma.$transaction([
    prisma.itemVenda.deleteMany(),
    prisma.venda.deleteMany(),
    prisma.cliente.deleteMany(),
    prisma.fotoPeca.deleteMany(),
    prisma.peca.deleteMany(),
    prisma.fornecedora.deleteMany(),
    prisma.sequencia.deleteMany(),
  ]);
}
