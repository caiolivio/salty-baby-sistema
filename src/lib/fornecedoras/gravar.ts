import "server-only";
import { prisma } from "../banco";
import { CHAVE_SEQUENCIA_FORNECEDORA, codigoFornecedora } from "../codigos";
import { numeroSeguro, type DadosFornecedora } from "./dados";

/**
 * Cria a fornecedora com o próximo código (F48, F49…). A linha da sequência fica
 * travada até o fim da transação, então dois cadastros ao mesmo tempo nunca
 * recebem o mesmo código.
 */
export async function criarFornecedora(dados: DadosFornecedora): Promise<{ id: string; codigo: string }> {
  return prisma.$transaction(async (tx) => {
    const chave = CHAVE_SEQUENCIA_FORNECEDORA;
    await tx.sequencia.upsert({ where: { chave }, create: { chave, ultimo: 0 }, update: {} });
    const sequencia = await tx.sequencia.update({ where: { chave }, data: { ultimo: { increment: 1 } } });
    const maior = await tx.fornecedora.aggregate({ _max: { numero: true } });
    const numero = numeroSeguro(sequencia.ultimo, maior._max.numero);
    if (numero !== sequencia.ultimo) await tx.sequencia.update({ where: { chave }, data: { ultimo: numero } });

    const codigo = codigoFornecedora(numero);
    const criada = await tx.fornecedora.create({ data: { ...dados, numero, codigo }, select: { id: true } });
    return { id: criada.id, codigo };
  });
}

/** O código não muda nunca; só os dados. */
export async function atualizarFornecedora(id: string, dados: DadosFornecedora & { ativa: boolean }): Promise<boolean> {
  const { count } = await prisma.fornecedora.updateMany({ where: { id }, data: dados });
  return count === 1;
}
