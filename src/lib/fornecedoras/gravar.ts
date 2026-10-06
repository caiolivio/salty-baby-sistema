import "server-only";
import { atualizarContaPelaLoja } from "../contas/pela-loja";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../banco";
import { CHAVE_SEQUENCIA_FORNECEDORA, codigoFornecedora } from "../codigos";
import { numeroSeguro, type DadosFornecedora } from "./dados";
import { registrar, rotuloDaFornecedora } from "../historico/gravar";
import { CAMPOS_FORNECEDORA, compararParcial, type Autor } from "../historico/regras";

/**
 * Cria a fornecedora com o próximo código (F48, F49…). A linha da sequência fica
 * travada até o fim da transação, então dois cadastros ao mesmo tempo nunca
 * recebem o mesmo código.
 */
export async function criarFornecedora(dados: DadosFornecedora): Promise<{ id: string; codigo: string }> {
  return prisma.$transaction((tx) => criarFornecedoraNaTransacao(tx, dados));
}

/** O mesmo, dentro de uma transação que já está aberta (ex.: ao efetivar uma candidata). */
export async function criarFornecedoraNaTransacao(
  tx: Prisma.TransactionClient,
  dados: Omit<Prisma.FornecedoraUncheckedCreateInput, "numero" | "codigo">,
): Promise<{ id: string; codigo: string }> {
  const chave = CHAVE_SEQUENCIA_FORNECEDORA;
  await tx.sequencia.upsert({ where: { chave }, create: { chave, ultimo: 0 }, update: {} });
  const sequencia = await tx.sequencia.update({ where: { chave }, data: { ultimo: { increment: 1 } } });
  const maior = await tx.fornecedora.aggregate({ _max: { numero: true } });
  const numero = numeroSeguro(sequencia.ultimo, maior._max.numero);
  if (numero !== sequencia.ultimo) await tx.sequencia.update({ where: { chave }, data: { ultimo: numero } });

  const codigo = codigoFornecedora(numero);
  const criada = await tx.fornecedora.create({ data: { ...dados, numero, codigo }, select: { id: true } });
  return { id: criada.id, codigo };
}

/** O código não muda nunca; só os dados. */
export async function atualizarFornecedora(
  id: string,
  dados: DadosFornecedora & { ativa: boolean },
  autor: Autor,
  /** Conta de entrada a atualizar junto (nome e e-mail), quando quem edita é a administradora. */
  contaId: string | null = null,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const antes = await tx.fornecedora.findUnique({ where: { id } });
    if (!antes) return false;
    await tx.fornecedora.update({ where: { id }, data: dados });
    const daConta = contaId ? await atualizarContaPelaLoja(tx, contaId, dados) : [];
    await registrar(
      tx,
      { tabela: "fornecedora", id, rotulo: rotuloDaFornecedora({ codigo: antes.codigo, nome: dados.nome }) },
      [...compararParcial(CAMPOS_FORNECEDORA, antes, dados), ...daConta],
      autor,
      "Edição no painel",
    );
    return true;
  });
}
