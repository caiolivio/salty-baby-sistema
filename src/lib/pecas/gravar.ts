import "server-only";
import type { Prisma, StatusPeca } from "@/generated/prisma/client";
import { prisma } from "../banco";
import { chaveSequenciaPeca, codigoPeca, numeroSeguro } from "../codigos";
import { apagarFoto, guardarFotoDePeca } from "../fotos";
import { registrar, registrarCadastro, registrarStatus, rotuloDaPeca, SELECAO_STATUS } from "../historico/gravar";
import { compararPeca, type Autor, type EstadoPeca } from "../historico/regras";
import { nomeDoStatus } from "../situacoes";
import { motivoParaNaoExcluir, moverNaLista, opcoesDeStatus, type DadosPeca } from "./dados";
import { lerLoja } from "../loja/servidor";

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

/** O que o histórico compara antes e depois de salvar. */
const SELECAO_HISTORICO = {
  codigo: true,
  nome: true,
  status: true,
  naoListada: true,
  precoCentavos: true,
  custoCentavos: true,
  percentualRepasse: true,
  quantidade: true,
  tamanho: true,
  genero: true,
  conservacao: true,
  nota: true,
  variacao: true,
  marca: true,
  cor: true,
  medidas: true,
  descricao: true,
  dataEntrada: true,
  categorias: { select: { categoria: { select: { nome: true } } } },
} as const;

async function estadoParaHistorico(tx: Transacao, id: string): Promise<(EstadoPeca & { codigo: string }) | null> {
  const p = await tx.peca.findUnique({ where: { id }, select: SELECAO_HISTORICO });
  return p ? { ...p, categorias: p.categorias.map((c) => c.categoria.nome) } : null;
}

/** Cadastra a peça com o próximo código. `fornecedora` vazia = peça da loja. */
export async function criarPeca(
  dados: DadosPeca,
  fornecedora: { id: string; codigo: string } | null,
  categoriaIds: string[],
  autor: Autor,
  motivo?: string,
): Promise<{ id: string; codigo: string }> {
  const { prefixoLoja } = await lerLoja();
  return prisma.$transaction(async (tx) => {
    const codigo = await reservarCodigo(tx, fornecedora?.codigo ?? prefixoLoja);
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
    const situacao = nomeDoStatus(dados.status, dados.naoListada);
    await registrarCadastro(tx, { tabela: "peca", id: criada.id, rotulo: rotuloDaPeca({ codigo, nome: dados.nome }) }, `Cadastrada: ${situacao}`, autor, motivo);
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
  autor: Autor,
  manterSituacao?: StatusPeca,
): Promise<void> {
  const campos = camposDoBanco(dados);
  await prisma.$transaction(async (tx) => {
    const antes = await estadoParaHistorico(tx, id);
    await tx.peca.update({
      where: { id },
      data: {
        ...campos,
        status: manterSituacao ?? campos.status,
        categorias: { deleteMany: {}, create: categoriaIds.map((categoriaId) => ({ categoriaId })) },
      },
    });
    const depois = await estadoParaHistorico(tx, id);
    if (antes && depois) {
      await registrar(tx, { tabela: "peca", id, rotulo: rotuloDaPeca(depois) }, compararPeca(antes, depois), autor, "Edição no painel");
    }
  });
}

/** Cria uma peça igual, com código novo, como rascunho e sem fotos. */
export async function duplicarPeca(id: string, hoje: string, autor: Autor): Promise<{ id: string; codigo: string } | null> {
  return prisma.$transaction(async (tx) => {
    const original = await tx.peca.findUnique({
      where: { id },
      include: { fornecedora: { select: { codigo: true } }, categorias: { select: { categoriaId: true } } },
    });
    if (!original) return null;
    // Peça da loja: o mesmo prefixo da original (ele não muda depois que há peças da loja).
    const codigo = await reservarCodigo(tx, original.fornecedora?.codigo ?? original.codigo.split("-")[0]);
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
        nota: original.nota,
        variacao: original.variacao,
        marca: original.marca,
        cor: original.cor,
        categorias: { create: original.categorias.map(({ categoriaId }) => ({ categoriaId })) },
        medidas: original.medidas,
        descricao: original.descricao,
        status: "rascunho",
        naoListada: false,
        dataEntrada: data(hoje),
      },
      select: { id: true },
    });
    await registrarCadastro(
      tx,
      { tabela: "peca", id: copia.id, rotulo: rotuloDaPeca({ codigo, nome: original.nome }) },
      `Cadastrada: Rascunho (cópia da ${original.codigo})`,
      autor,
    );
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

/** Muda a posição de uma foto (0 = foto em destaque, a que aparece na lista e na vitrine). */
export async function moverFoto(pecaId: string, fotoId: string, destino: number): Promise<void> {
  const fotos = await prisma.fotoPeca.findMany({ where: { pecaId }, orderBy: { ordem: "asc" }, select: { id: true } });
  const nova = moverNaLista(
    fotos.map((f) => f.id),
    fotoId,
    destino,
  );
  await prisma.$transaction(nova.map((id, ordem) => prisma.fotoPeca.update({ where: { id }, data: { ordem } })));
}

export type ResultadoDaPeca = { ok: true } | { ok: false; erro: string };

class Recusa extends Error {}

/**
 * Troca o status de uma peça que está fora do estoque comum (reservada, com
 * devolução pedida ou já vendida), cuidando do que depende dele: a peça
 * reservada sai do pedido (o pedido de uma peça só é cancelado) e a devolução
 * pedida é concluída ("Devolvida") ou cancelada.
 */
export async function mudarStatusDaPeca(id: string, novo: string, autor: Autor): Promise<ResultadoDaPeca> {
  try {
    await prisma.$transaction(async (tx) => {
      const peca = await tx.peca.findUnique({ where: { id }, select: { ...SELECAO_STATUS, precoCentavos: true } });
      if (!peca) throw new Recusa("Esta peça não existe mais.");
      if (!opcoesDeStatus(peca.status).some((o) => o.valor === novo)) throw new Recusa("Este status não pode ser escolhido para esta peça.");
      if (novo === peca.status) return;
      const naoListada = novo === "nao_listada";
      const status = (naoListada ? "publicada" : novo) as StatusPeca;
      if (status === "publicada" && peca.precoCentavos <= 0) throw new Recusa("Para colocar à venda, escreva o preço.");

      const motivos: string[] = [];
      if (peca.status === "reservada") {
        const itens = await tx.itemPedido.findMany({
          where: { pecaId: id, pedido: { status: "reservado" } },
          select: { pedidoId: true, pedido: { select: { numero: true, itens: { select: { pecaId: true, precoCentavos: true, descontoCentavos: true, descontoCupomCentavos: true } } } } },
        });
        for (const item of itens) {
          const resto = item.pedido.itens.filter((i) => i.pecaId !== id);
          if (resto.length === 0) {
            await tx.pedido.update({ where: { id: item.pedidoId }, data: { status: "cancelado" } });
            motivos.push(`pedido nº ${item.pedido.numero} cancelado`);
          } else {
            await tx.itemPedido.delete({ where: { pedidoId_pecaId: { pedidoId: item.pedidoId, pecaId: id } } });
            await tx.pedido.update({
              where: { id: item.pedidoId },
              data: {
                totalCentavos: resto.reduce((soma, i) => soma + i.precoCentavos - i.descontoCentavos - i.descontoCupomCentavos, 0),
                descontoCupomCentavos: resto.reduce((soma, i) => soma + i.descontoCupomCentavos, 0),
              },
            });
            motivos.push(`tirada do pedido nº ${item.pedido.numero}`);
          }
        }
      }
      if (peca.status === "devolucao_pedida") {
        const devolvida = status === "devolvida";
        await tx.devolucao.updateMany({
          where: { pecaId: id, situacao: "pedida" },
          data: { situacao: devolvida ? "devolvida" : "cancelada", concluidaEm: new Date() },
        });
        motivos.push(devolvida ? "devolvida à fornecedora" : "pedido de devolução cancelado");
      }

      // Só muda se ninguém mexeu na peça enquanto isso.
      const mudou = await tx.peca.updateMany({ where: { id, status: peca.status }, data: { status, naoListada } });
      if (mudou.count === 0) throw new Recusa("O status desta peça mudou enquanto você editava. Abra a peça de novo.");
      const motivo = ["Status mudado no painel", ...motivos].join("; ");
      await registrarStatus(tx, [peca], { status, naoListada }, autor, motivo);
    });
    return { ok: true };
  } catch (erro) {
    if (erro instanceof Recusa) return { ok: false, erro: erro.message };
    throw erro;
  }
}

/** Situação da peça para o botão de excluir (null = pode excluir). */
export async function motivoParaNaoExcluirPeca(tx: Transacao | typeof prisma, id: string): Promise<string | null> {
  const peca = await tx.peca.findUnique({
    where: { id },
    select: {
      status: true,
      _count: { select: { itensVendidos: true } },
      itensPedido: { where: { pedido: { status: { in: ["reservado", "pago"] } } }, select: { pedido: { select: { numero: true } } }, take: 1 },
    },
  });
  if (!peca) return "Esta peça não existe mais.";
  return motivoParaNaoExcluir({
    status: peca.status,
    vendas: peca._count.itensVendidos,
    pedidoAberto: peca.itensPedido[0]?.pedido.numero ?? null,
  });
}

/**
 * Exclui a peça, as fotos, as categorias e os favoritos. Peça vendida ou num
 * pedido aberto não sai. O código não volta para a fila: a sequência da
 * fornecedora continua de onde estava. Pedidos antigos (cancelados ou vencidos)
 * perdem a linha desta peça; o histórico guarda a exclusão.
 */
export async function excluirPeca(id: string, autor: Autor): Promise<ResultadoDaPeca & { codigo?: string }> {
  try {
    const { codigo, fotos } = await prisma.$transaction(async (tx) => {
      const motivo = await motivoParaNaoExcluirPeca(tx, id);
      if (motivo) throw new Recusa(motivo);
      const peca = await tx.peca.findUniqueOrThrow({
        where: { id },
        select: { codigo: true, nome: true, status: true, naoListada: true, fotos: { select: { arquivo: true } } },
      });
      await tx.itemPedido.deleteMany({ where: { pecaId: id } });
      await tx.peca.delete({ where: { id } });
      await registrar(
        tx,
        { tabela: "peca", id, rotulo: rotuloDaPeca(peca) },
        [{ campo: "Exclusão", antes: nomeDoStatus(peca.status, peca.naoListada), depois: "Peça excluída", restrito: false }],
        autor,
        "Excluída no painel",
      );
      return { codigo: peca.codigo, fotos: peca.fotos.map((f) => f.arquivo) };
    });
    await Promise.all(fotos.map((f) => apagarFoto(f).catch(() => undefined)));
    return { ok: true, codigo };
  } catch (erro) {
    if (erro instanceof Recusa) return { ok: false, erro: erro.message };
    throw erro;
  }
}
