import "server-only";
import { prisma } from "../banco";
import { periodoDoMes } from "./regras";

// Banco do relatório mensal: as vendas das peças consignadas (as da loja não
// têm repasse) e o registro de quem já recebeu o relatório pelo WhatsApp.

const SELECAO_ITEM = {
  id: true,
  quantidade: true,
  precoUnitarioCentavos: true,
  descontoCentavos: true,
  valorPagoCentavos: true,
  repasseCentavos: true,
  repasseRecebido: true,
  venda: { select: { data: true } },
  peca: { select: { codigo: true, nome: true } },
} as const;

/** Todas as vendas consignadas da fornecedora (para os meses e a comparação com o mês anterior). */
export async function vendasDoRelatorio(fornecedoraId: string) {
  const itens = await prisma.itemVenda.findMany({
    where: { peca: { fornecedoraId, tipo: "consignada" } },
    select: SELECAO_ITEM,
  });
  return itens.map(({ venda, ...i }) => ({ ...i, data: venda.data }));
}

/** Fornecedoras com vendas no mês, com o que já foi enviado. */
export async function relatoriosDoMes(mes: string) {
  const { de, ate } = periodoDoMes(mes);
  const [itens, enviados] = await Promise.all([
    prisma.itemVenda.findMany({
      where: {
        peca: { tipo: "consignada", fornecedoraId: { not: null } },
        venda: { data: { gte: new Date(`${de}T00:00:00Z`), lte: new Date(`${ate}T00:00:00Z`) } },
      },
      select: {
        quantidade: true,
        valorPagoCentavos: true,
        repasseCentavos: true,
        peca: { select: { fornecedora: { select: { id: true, codigo: true, nome: true, telefone: true } } } },
      },
    }),
    prisma.relatorioEnviado.findMany({ where: { mes }, select: { fornecedoraId: true, enviadoEm: true, quem: true } }),
  ]);
  type Linha = {
    fornecedora: { id: string; codigo: string; nome: string; telefone: string | null };
    pecas: number;
    vendidoCentavos: number;
    repasseCentavos: number;
    enviado: { enviadoEm: Date; quem: string } | null;
  };
  const porFornecedora = new Map<string, Linha>();
  for (const i of itens) {
    const f = i.peca.fornecedora;
    if (!f) continue;
    const linha = porFornecedora.get(f.id) ?? { fornecedora: f, pecas: 0, vendidoCentavos: 0, repasseCentavos: 0, enviado: null };
    linha.pecas += i.quantidade;
    linha.vendidoCentavos += i.valorPagoCentavos;
    linha.repasseCentavos += i.repasseCentavos;
    porFornecedora.set(f.id, linha);
  }
  for (const e of enviados) {
    const linha = porFornecedora.get(e.fornecedoraId);
    if (linha) linha.enviado = { enviadoEm: e.enviadoEm, quem: e.quem };
  }
  return [...porFornecedora.values()].sort((a, b) => a.fornecedora.codigo.localeCompare(b.fornecedora.codigo, "pt-BR", { numeric: true }));
}

/** Marca o relatório do mês como enviado (enviar de novo só atualiza a data). */
export async function marcarRelatorioEnviado(fornecedoraId: string, mes: string, quem: string) {
  await prisma.relatorioEnviado.upsert({
    where: { fornecedoraId_mes: { fornecedoraId, mes } },
    create: { fornecedoraId, mes, quem },
    update: { enviadoEm: new Date(), quem },
  });
}
