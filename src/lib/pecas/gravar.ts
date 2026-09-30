import "server-only";
import type { Prisma, StatusPeca } from "@/generated/prisma/client";
import { prisma } from "../banco";
import { chaveSequenciaPeca, codigoPeca, numeroSeguro, PREFIXO_LOJA } from "../codigos";
import { apagarFoto, guardarFotoDePeca } from "../fotos";
import type { DadosPeca } from "./dados";

type Transacao = Prisma.TransactionClient;

/** Máximo de fotos por peça. */
export const LIMITE_FOTOS = 10;

const data = (aaaammdd: string) => new Date(`${aaaammdd}T00:00:00Z`);

/**
 * Reserva o próximo código da fornecedora (F06-00042) ou da loja (SB-00030). A
 * linha da sequência fica travada até o fim da transação, então duas peças
 * cadastradas ao mesmo tempo nunca recebem o mesmo código.
 */
async function reservarCodigo(tx: Transacao, prefixo: string): Promise<string> {
  const chave = chaveSequenciaPeca(prefixo);
  await tx.sequencia.upsert({ where: { chave }, create: { chave, ultimo: 0 }, update: {} });
  const sequencia = await tx.sequencia.update({ where: { chave }, data: { ultimo: { increment: 1 } } });
  const maior = await tx.peca.findFirst({
    where: { codigo: { startsWith: `${prefixo}-` } },
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const maiorNumero = maior ? Number(maior.codigo.slice(prefixo.length + 1)) || 0 : null;
  const numero = numeroSeguro(sequencia.ultimo, maiorNumero);
  if (numero !== sequencia.ultimo) await tx.sequencia.update({ where: { chave }, data: { ultimo: numero } });
  return codigoPeca(prefixo, numero);
}

function camposDoBanco(dados: DadosPeca) {
  return { ...dados, dataEntrada: data(dados.dataEntrada) };
}

/** Cadastra a peça com o próximo código. `fornecedora` vazia = peça da loja. */
export async function criarPeca(
  dados: DadosPeca,
  fornecedora: { id: string; codigo: string } | null,
  categoriaIds: string[],
): Promise<{ id: string; codigo: string }> {
  return prisma.$transaction(async (tx) => {
    const codigo = await reservarCodigo(tx, fornecedora?.codigo ?? PREFIXO_LOJA);
    const criada = await tx.peca.create({
      data: {
        ...camposDoBanco(dados),
        codigo,
        tipo: fornecedora ? "consignada" : "loja",
        fornecedoraId: fornecedora?.id ?? null,
        categorias: { create: categoriaIds.map((categoriaId) => ({ categoriaId })) },
      },
      select: { id: true },
    });
    return { id: criada.id, codigo };
  });
}

/**
 * Salva as mudanças. A fornecedora e o código nunca mudam (o código leva o da
 * fornecedora). `manterSituacao` é usado nas peças já vendidas, cuja situação
 * só muda pela venda.
 */
export async function atualizarPeca(
  id: string,
  dados: DadosPeca,
  categoriaIds: string[],
  manterSituacao?: StatusPeca,
): Promise<void> {
  const campos = camposDoBanco(dados);
  await prisma.peca.update({
    where: { id },
    data: {
      ...campos,
      status: manterSituacao ?? campos.status,
      categorias: { deleteMany: {}, create: categoriaIds.map((categoriaId) => ({ categoriaId })) },
    },
  });
}

/** Cria uma peça igual, com código novo, como rascunho e sem fotos. */
export async function duplicarPeca(id: string, hoje: string): Promise<{ id: string; codigo: string } | null> {
  return prisma.$transaction(async (tx) => {
    const original = await tx.peca.findUnique({
      where: { id },
      include: { fornecedora: { select: { codigo: true } }, categorias: { select: { categoriaId: true } } },
    });
    if (!original) return null;
    const codigo = await reservarCodigo(tx, original.fornecedora?.codigo ?? PREFIXO_LOJA);
    const copia = await tx.peca.create({
      data: {
        codigo,
        nome: original.nome,
        tipo: original.tipo,
        fornecedoraId: original.fornecedoraId,
        percentualRepasse: original.percentualRepasse,
        precoCentavos: original.precoCentavos,
        custoCentavos: original.custoCentavos,
        quantidade: 1,
        tamanho: original.tamanho,
        genero: original.genero,
        conservacao: original.conservacao,
        variacao: original.variacao,
        marca: original.marca,
        cor: original.cor,
        categorias: { create: original.categorias.map(({ categoriaId }) => ({ categoriaId })) },
        medidas: original.medidas,
        descricao: original.descricao,
        status: "rascunho",
        dataEntrada: data(hoje),
      },
      select: { id: true },
    });
    return { id: copia.id, codigo };
  });
}

/** Reduz e guarda as fotos novas, depois das que a peça já tem. */
export async function adicionarFotos(pecaId: string, arquivos: Buffer[]): Promise<{ guardadas: number; recusadas: number }> {
  const existentes = await prisma.fotoPeca.findMany({ where: { pecaId }, select: { ordem: true } });
  let ordem = existentes.reduce((maior, f) => Math.max(maior, f.ordem + 1), 0);
  const espaco = Math.max(0, LIMITE_FOTOS - existentes.length);
  let guardadas = 0;
  let recusadas = Math.max(0, arquivos.length - espaco);
  for (const conteudo of arquivos.slice(0, espaco)) {
    try {
      const arquivo = await guardarFotoDePeca(pecaId, conteudo);
      await prisma.fotoPeca.create({ data: { pecaId, arquivo, ordem: ordem++ } });
      guardadas++;
    } catch (erro) {
      console.error(`Foto recusada na peça ${pecaId}:`, erro);
      recusadas++;
    }
  }
  return { guardadas, recusadas };
}

export async function removerFoto(pecaId: string, fotoId: string): Promise<void> {
  const foto = await prisma.fotoPeca.findFirst({ where: { id: fotoId, pecaId } });
  if (!foto) return;
  await prisma.fotoPeca.delete({ where: { id: foto.id } });
  await apagarFoto(foto.arquivo);
}

/** A foto escolhida passa a ser a primeira (a que aparece na lista e na vitrine). */
export async function fotoPrincipal(pecaId: string, fotoId: string): Promise<void> {
  const fotos = await prisma.fotoPeca.findMany({ where: { pecaId }, orderBy: { ordem: "asc" }, select: { id: true } });
  if (!fotos.some((f) => f.id === fotoId)) return;
  const nova = [fotoId, ...fotos.map((f) => f.id).filter((id) => id !== fotoId)];
  await prisma.$transaction(nova.map((id, ordem) => prisma.fotoPeca.update({ where: { id }, data: { ordem } })));
}
