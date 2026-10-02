import "server-only";
import { prisma } from "../banco";
import { gerarCodigoDoLink } from "../clientes/conta";
import { contaComPerfil, gravarLinkDeSenha } from "../clientes/contas";
import { guardarFotoDeProposta, lerFotoGuardada } from "../fotos";
import { adicionarFotos, criarPeca } from "../pecas/gravar";
import { VERSAO_ACORDO } from "./acordo";
import type { DadosInscricao, DadosProposta } from "./candidatura";
import { criarFornecedoraNaTransacao } from "./gravar";
import type { Autor } from "../historico/regras";

// "Seja uma fornecedora": inscrição (passo 1), curadoria no painel, peças e
// acordo (passo 2) e efetivação da parceria (passo 3).

/** Passo 1: grava a inscrição e as fotos das peças. */
export async function registrarInscricao(dados: DadosInscricao, fotos: Buffer[]): Promise<string> {
  const guardadas: string[] = [];
  for (const foto of fotos) guardadas.push(await guardarFotoDeProposta(foto));
  const { pecas, ...pessoa } = dados;
  const criada = await prisma.candidatura.create({
    data: {
      ...pessoa,
      pecas: { create: pecas.map((descricao, i) => ({ descricao, foto: guardadas[i] })) },
    },
    select: { id: true },
  });
  return criada.id;
}

export type ResultadoAprovacao =
  | { ok: true; codigo: string; novaConta: boolean }
  | { ok: false; motivo: "nao-encontrada" | "etapa" | "email-de-outra-fornecedora" };

/**
 * A curadoria aprova o passo 1: a pessoa ganha acesso à área da fornecedora
 * (para o passo 2) e um link para criar a senha. Também serve para gerar um
 * link novo, se ela perder o primeiro.
 */
export async function aprovarCandidatura(id: string, agora = new Date()): Promise<ResultadoAprovacao> {
  const codigo = gerarCodigoDoLink();
  return prisma.$transaction(
    async (tx) => {
      const c = await tx.candidatura.findUnique({ where: { id } });
      if (!c) return { ok: false as const, motivo: "nao-encontrada" as const };
      if (c.etapa === "recusada" || c.etapa === "efetivada") return { ok: false as const, motivo: "etapa" as const };
      let usuarioId = c.usuarioId;
      let novaConta = false;
      if (!usuarioId) {
        const outra = await tx.usuario.findUnique({
          where: { email: c.email },
          select: { fornecedora: { select: { id: true } }, candidatura: { select: { id: true } } },
        });
        if (outra?.fornecedora || outra?.candidatura) return { ok: false as const, motivo: "email-de-outra-fornecedora" as const };
        const conta = await contaComPerfil(tx, { nome: c.nome, email: c.email }, "fornecedora");
        usuarioId = conta.id;
        novaConta = conta.nova;
      }
      await tx.candidatura.update({
        where: { id },
        data: { usuarioId, etapa: c.etapa === "enviada" ? "aprovada" : c.etapa },
      });
      await gravarLinkDeSenha(tx, usuarioId, codigo, agora);
      return { ok: true as const, codigo, novaConta };
    },
    { isolationLevel: "Serializable" },
  );
}

export async function recusarCandidatura(id: string, observacao: string | null): Promise<boolean> {
  const r = await prisma.candidatura.updateMany({
    where: { id, etapa: { in: ["enviada", "aprovada", "acordo_aceito"] } },
    data: { etapa: "recusada", ...(observacao !== null && { observacao }) },
  });
  return r.count === 1;
}

export async function anotarCandidatura(id: string, observacao: string | null): Promise<void> {
  await prisma.candidatura.update({ where: { id }, data: { observacao } });
}

/** Passo 2 (ou depois, já parceira): mais uma peça proposta, com foto e detalhes. */
export async function registrarProposta(
  dono: { candidaturaId: string } | { fornecedoraId: string },
  dados: DadosProposta,
  foto: Buffer,
): Promise<void> {
  const arquivo = await guardarFotoDeProposta(foto);
  const categoria = dados.categoriaId
    ? await prisma.categoria.findFirst({ where: { id: dados.categoriaId, ativa: true }, select: { id: true } })
    : null;
  await prisma.pecaProposta.create({
    data: { ...dono, ...dados, categoriaId: categoria?.id ?? null, foto: arquivo },
  });
}

/** Tira uma peça proposta que a Salty ainda não avaliou (só a dona tira). */
export async function tirarProposta(
  id: string,
  dono: { candidaturaId: string } | { fornecedoraId: string },
): Promise<void> {
  await prisma.pecaProposta.deleteMany({ where: { id, ...dono, situacao: "proposta" } });
}

/** Passo 2 concluído: a candidata aceitou o acordo. A Salty entra em contato para efetivar. */
export async function aceitarAcordo(candidaturaId: string, agora = new Date()): Promise<boolean> {
  const r = await prisma.candidatura.updateMany({
    where: { id: candidaturaId, etapa: "aprovada" },
    data: { etapa: "acordo_aceito", acordoAceitoEm: agora, acordoVersao: VERSAO_ACORDO },
  });
  return r.count === 1;
}

export type ResultadoEfetivacao =
  | { ok: true; codigo: string; fornecedoraId: string }
  | { ok: false; motivo: "nao-encontrada" | "sem-acordo" | "ja-efetivada" };

/**
 * Passo 3: a Salty efetiva a parceria. Cria a fornecedora com o próximo
 * código (F48, F49…), ligada à conta da candidata, e as peças propostas passam
 * a ser dela.
 */
export async function efetivarCandidatura(id: string): Promise<ResultadoEfetivacao> {
  return prisma.$transaction(async (tx) => {
    const c = await tx.candidatura.findUnique({ where: { id } });
    if (!c) return { ok: false as const, motivo: "nao-encontrada" as const };
    if (c.fornecedoraId || c.etapa === "efetivada") return { ok: false as const, motivo: "ja-efetivada" as const };
    if (c.etapa !== "acordo_aceito" || !c.acordoAceitoEm) return { ok: false as const, motivo: "sem-acordo" as const };
    const { id: fornecedoraId, codigo } = await criarFornecedoraNaTransacao(tx, {
      nome: c.nome,
      email: c.email,
      telefone: c.telefone,
      endereco: c.endereco,
      cep: c.cep,
      cidade: c.cidade,
      estado: c.estado,
      usuarioId: c.usuarioId,
      termosAceitosEm: c.acordoAceitoEm,
      termosVersao: c.acordoVersao,
    });
    await tx.candidatura.update({ where: { id }, data: { etapa: "efetivada", fornecedoraId } });
    await tx.pecaProposta.updateMany({ where: { candidaturaId: id }, data: { fornecedoraId } });
    return { ok: true as const, codigo, fornecedoraId };
  });
}

/** Como está a pessoa logada na área da fornecedora. */
export async function situacaoNaArea(usuarioId: string) {
  const fornecedora = await prisma.fornecedora.findUnique({
    where: { usuarioId },
    select: {
      id: true,
      codigo: true,
      nome: true,
      email: true,
      telefone: true,
      endereco: true,
      cep: true,
      cidade: true,
      estado: true,
      pix: true,
      termosAceitosEm: true,
      termosVersao: true,
      boasVindasEm: true,
      ativa: true,
      candidatura: { select: { id: true } },
    },
  });
  if (fornecedora) return { tipo: "fornecedora" as const, fornecedora };
  const candidatura = await prisma.candidatura.findUnique({
    where: { usuarioId },
    select: { id: true, nome: true, etapa: true, acordoAceitoEm: true },
  });
  if (candidatura) return { tipo: "candidata" as const, candidatura };
  return { tipo: "sem-cadastro" as const };
}

/** A fornecedora viu o "Parabéns" e passa para a área de verdade (passo 4). */
export async function marcarBoasVindas(fornecedoraId: string, agora = new Date()): Promise<void> {
  await prisma.fornecedora.updateMany({ where: { id: fornecedoraId, boasVindasEm: null }, data: { boasVindasEm: agora } });
}

export type ResultadoRecebimento =
  | { ok: true; pecaId: string; codigo: string }
  | { ok: false; motivo: "nao-encontrada" | "sem-fornecedora" | "ja-avaliada" };

/**
 * A Salty recebeu a peça proposta: ela entra no estoque como rascunho, com o
 * código da fornecedora, os dados e a foto da proposta. O preço a Salty põe
 * depois, na página da peça.
 */
export async function receberProposta(id: string, hoje: string, autor: Autor): Promise<ResultadoRecebimento> {
  const proposta = await prisma.pecaProposta.findUnique({
    where: { id },
    include: { fornecedora: { select: { id: true, codigo: true, percentualRepassePadrao: true, ativa: true } } },
  });
  if (!proposta) return { ok: false, motivo: "nao-encontrada" };
  if (!proposta.fornecedora) return { ok: false, motivo: "sem-fornecedora" };
  // Marca antes de criar, para dois cliques não criarem duas peças.
  const marcada = await prisma.pecaProposta.updateMany({ where: { id, situacao: "proposta" }, data: { situacao: "recebida" } });
  if (marcada.count === 0) return { ok: false, motivo: "ja-avaliada" };
  try {
    const nome = proposta.nome ?? (proposta.descricao.length > 60 ? `${proposta.descricao.slice(0, 57)}…` : proposta.descricao);
    const peca = await criarPeca(
      {
        nome,
        tamanho: proposta.tamanho,
        genero: proposta.genero,
        conservacao: proposta.conservacao,
        nota: null,
        variacao: null,
        marca: proposta.marca,
        cor: null,
        medidas: null,
        descricao: proposta.descricao,
        precoCentavos: 0,
        custoCentavos: null,
        percentualRepasse: proposta.fornecedora.percentualRepassePadrao,
        quantidade: 1,
        status: "rascunho",
        naoListada: false,
        dataEntrada: hoje,
      },
      proposta.fornecedora,
      proposta.categoriaId ? [proposta.categoriaId] : [],
      autor,
      "Peça proposta pela fornecedora, recebida na loja",
    );
    await prisma.pecaProposta.update({ where: { id }, data: { pecaId: peca.id } });
    const foto = await lerFotoGuardada(proposta.foto);
    if (foto) await adicionarFotos(peca.id, [foto]);
    return { ok: true, pecaId: peca.id, codigo: peca.codigo };
  } catch (erro) {
    await prisma.pecaProposta.updateMany({ where: { id, pecaId: null }, data: { situacao: "proposta" } });
    throw erro;
  }
}

/** A curadoria não aceitou esta peça. */
export async function recusarProposta(id: string): Promise<void> {
  await prisma.pecaProposta.updateMany({ where: { id, situacao: "proposta" }, data: { situacao: "recusada" } });
}
