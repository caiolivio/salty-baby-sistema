import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { prisma } from "../banco";
import { apagarImagemDaLoja, guardarImagemDaLoja } from "../fotos";
import { registrar } from "../historico/gravar";
import { comparar, CAMPOS_LOJA, type Autor } from "../historico/regras";
import { ICONE_PADRAO, LOGO_PADRAO, LOJA_PADRAO, type DadosLoja, type Loja } from "./regras";

// Configurações da loja (tabela configuracao_loja, linha 1). Lidas uma vez por
// requisição; se o banco não responder (por exemplo, no build), valem as da Salty.

const ID = 1;

const SELECAO = {
  nome: true,
  nomeCurto: true,
  slogan: true,
  descricao: true,
  whatsapp: true,
  instagram: true,
  corDestaque: true,
  corPrincipal: true,
  corTexto: true,
  logo: true,
  icone: true,
  prefixoLoja: true,
  repassePadrao: true,
  minutosReserva: true,
  mesesDevolucao: true,
  atualizadoEm: true,
} as const;

export type LojaLida = Loja & { versao: number };

export const lerLoja = cache(async (): Promise<LojaLida> => {
  // As páginas mostram os dados da loja de agora, nunca uma cópia feita no build.
  await connection();
  try {
    const linha = await prisma.configuracaoLoja.findUnique({ where: { id: ID }, select: SELECAO });
    if (linha) {
      const { atualizadoEm, ...loja } = linha;
      return { ...loja, versao: atualizadoEm.getTime() };
    }
  } catch (erro) {
    console.error("Não foi possível ler as configurações da loja:", erro);
  }
  return { ...LOJA_PADRAO, versao: 0 };
});

/** Endereços do logo e do ícone (o ?v= muda quando a imagem muda, para o navegador buscar a nova). */
export function imagensDaLoja(loja: LojaLida): { logo: string; icone: string } {
  return {
    logo: loja.logo ? `/loja/logo.png?v=${loja.versao}` : LOGO_PADRAO,
    icone: loja.icone ? `/loja/icone.png?v=${loja.versao}` : ICONE_PADRAO,
  };
}

/** Já existe peça da loja com este prefixo? Então ele não pode mais mudar (os códigos levam o prefixo). */
export async function prefixoEmUso(prefixo: string): Promise<boolean> {
  return (await prisma.peca.count({ where: { codigo: { startsWith: `${prefixo}-` } } })) > 0;
}

type Imagens = { logo?: Buffer | "padrao"; icone?: Buffer | "padrao" };

/** Grava as configurações (e as imagens novas), com o que mudou no histórico. */
export async function salvarLoja(dados: DadosLoja, imagens: Imagens, autor: Autor): Promise<void> {
  const antes = await lerLoja();
  const novas: { logo?: string | null; icone?: string | null } = {};
  for (const tipo of ["logo", "icone"] as const) {
    const imagem = imagens[tipo];
    if (imagem === "padrao") novas[tipo] = null;
    else if (imagem) novas[tipo] = await guardarImagemDaLoja(tipo, imagem);
  }
  const depois = await prisma.$transaction(async (tx) => {
    const atual = await tx.configuracaoLoja.findUnique({ where: { id: ID }, select: SELECAO });
    const linha = await tx.configuracaoLoja.upsert({
      where: { id: ID },
      create: { id: ID, ...dados, logo: novas.logo ?? null, icone: novas.icone ?? null },
      update: { ...dados, ...novas },
      select: SELECAO,
    });
    await registrar(
      tx,
      { tabela: "loja", id: String(ID), rotulo: `Configurações · ${linha.nome}` },
      comparar(CAMPOS_LOJA, atual ?? { ...LOJA_PADRAO }, linha),
      autor,
      "Configurações da loja",
    );
    return linha;
  });
  // A imagem antiga só sai depois que a nova está gravada.
  for (const tipo of ["logo", "icone"] as const) {
    if (tipo in novas && antes[tipo] && antes[tipo] !== depois[tipo]) await apagarImagemDaLoja(antes[tipo]).catch(() => undefined);
  }
}
