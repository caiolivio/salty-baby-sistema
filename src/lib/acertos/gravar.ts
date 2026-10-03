import "server-only";
import { prisma } from "../banco";
import { formatarReais } from "../dinheiro";
import { registrar, rotuloDaFornecedora } from "../historico/gravar";
import type { Autor } from "../historico/regras";
import { nomeDaFormaAcerto, type DadosAcerto } from "./regras";

// Acerto com as fornecedoras: o que falta pagar e o registro do pagamento.

/** Repasses que a fornecedora ainda não recebeu (só peças consignadas). */
const PENDENTE = { repasseRecebido: false, peca: { tipo: "consignada" as const } };

/** Itens vendidos ainda não pagos de todas as fornecedoras, para "Contas a pagar". */
export async function repassesPendentes() {
  return prisma.itemVenda.findMany({
    where: { ...PENDENTE, peca: { ...PENDENTE.peca, fornecedoraId: { not: null } } },
    select: {
      id: true,
      quantidade: true,
      repasseCentavos: true,
      venda: { select: { data: true } },
      peca: { select: { fornecedora: { select: { id: true, codigo: true, nome: true, pix: true, telefone: true } } } },
    },
  });
}

/** Vendas da fornecedora com repasse a pagar, da mais antiga para a mais nova. */
export async function pendentesDaFornecedora(fornecedoraId: string) {
  const itens = await prisma.itemVenda.findMany({
    where: { ...PENDENTE, peca: { ...PENDENTE.peca, fornecedoraId } },
    orderBy: [{ venda: { data: "asc" } }, { id: "asc" }],
    select: {
      id: true,
      quantidade: true,
      valorPagoCentavos: true,
      repasseCentavos: true,
      venda: { select: { data: true } },
      peca: { select: { id: true, codigo: true, nome: true } },
    },
  });
  return itens.map((i) => ({ ...i, data: i.venda.data }));
}

export class AcertoMudou extends Error {
  constructor() {
    super("Alguma venda marcada já foi paga ou mudou. Confira a lista e tente de novo.");
  }
}

/**
 * Registra o pagamento das vendas marcadas: cada item fica como recebido,
 * ligado ao acerto, e o acerto guarda o total para o comprovante. Tudo ou nada.
 */
export async function registrarAcerto(fornecedoraId: string, dados: DadosAcerto, autor: Autor): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const fornecedora = await tx.fornecedora.findUniqueOrThrow({ where: { id: fornecedoraId }, select: { id: true, codigo: true, nome: true } });
    const itens = await tx.itemVenda.findMany({
      where: { id: { in: dados.itemIds }, ...PENDENTE, peca: { ...PENDENTE.peca, fornecedoraId } },
      select: { id: true, quantidade: true, repasseCentavos: true },
    });
    if (itens.length !== dados.itemIds.length) throw new AcertoMudou();

    await tx.sequencia.upsert({ where: { chave: "acerto" }, create: { chave: "acerto", ultimo: 0 }, update: {} });
    const { ultimo: numero } = await tx.sequencia.update({ where: { chave: "acerto" }, data: { ultimo: { increment: 1 } } });

    const total = itens.reduce((s, i) => s + i.repasseCentavos, 0);
    const pecas = itens.reduce((s, i) => s + i.quantidade, 0);
    const data = new Date(`${dados.data}T00:00:00Z`);
    const acerto = await tx.acerto.create({
      data: {
        numero,
        fornecedoraId,
        data,
        forma: dados.forma,
        totalCentavos: total,
        pecas,
        observacao: dados.observacao,
        usuarioId: autor.usuarioId,
        quem: autor.nome.slice(0, 191),
      },
    });
    // Só marca o que ainda está pendente: se outra pessoa pagou ao mesmo tempo, desfaz tudo.
    const marcados = await tx.itemVenda.updateMany({
      where: { id: { in: dados.itemIds }, repasseRecebido: false },
      data: { repasseRecebido: true, repasseRecebidoEm: data, acertoId: acerto.id },
    });
    if (marcados.count !== itens.length) throw new AcertoMudou();

    await registrar(
      tx,
      { tabela: "fornecedora", id: fornecedora.id, rotulo: rotuloDaFornecedora(fornecedora) },
      [
        {
          campo: "Repasse pago",
          antes: null,
          depois: `Comprovante nº ${numero}: ${formatarReais(total)} (${pecas} ${pecas === 1 ? "peça" : "peças"}), ${nomeDaFormaAcerto(dados.forma)}`,
          restrito: true,
        },
      ],
      autor,
      "Acerto com a fornecedora",
    );
    return { id: acerto.id };
  });
}

/** Desfaz um pagamento registrado por engano: as vendas voltam a ficar a pagar. */
export async function desfazerAcerto(id: string, autor: Autor, agora = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const acerto = await tx.acerto.findUnique({
      where: { id },
      select: { id: true, numero: true, canceladoEm: true, totalCentavos: true, fornecedora: { select: { id: true, codigo: true, nome: true } } },
    });
    if (!acerto || acerto.canceladoEm) return false;
    await tx.itemVenda.updateMany({
      where: { acertoId: id },
      data: { repasseRecebido: false, repasseRecebidoEm: null, acertoId: null },
    });
    await tx.acerto.update({ where: { id }, data: { canceladoEm: agora, canceladoPor: autor.nome.slice(0, 191) } });
    await registrar(
      tx,
      { tabela: "fornecedora", id: acerto.fornecedora.id, rotulo: rotuloDaFornecedora(acerto.fornecedora) },
      [
        {
          campo: "Repasse pago",
          antes: `Comprovante nº ${acerto.numero}: ${formatarReais(acerto.totalCentavos)}`,
          depois: "(pagamento desfeito)",
          restrito: true,
        },
      ],
      autor,
      "Pagamento desfeito: as vendas voltaram a ficar a pagar",
    );
    return true;
  });
}

/** Comprovante completo de um acerto. Com `fornecedoraId`, só se for dela e não desfeito. */
export async function buscarAcerto(id: string, fornecedoraId?: string) {
  return prisma.acerto.findFirst({
    where: fornecedoraId ? { id, fornecedoraId, canceladoEm: null } : { id },
    include: {
      fornecedora: { select: { id: true, codigo: true, nome: true, telefone: true } },
      itens: {
        orderBy: [{ venda: { data: "asc" } }, { id: "asc" }],
        select: {
          id: true,
          valorPagoCentavos: true,
          repasseCentavos: true,
          venda: { select: { data: true } },
          peca: { select: { id: true, codigo: true, nome: true } },
        },
      },
    },
  });
}

export type AcertoCompleto = NonNullable<Awaited<ReturnType<typeof buscarAcerto>>>;
