"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { lerNomeCategoria } from "@/lib/categorias";

export type EstadoCategoria = { erro?: string; aviso?: string } | undefined;

// O banco não aceita dois nomes iguais (nem com diferença só de acento ou maiúscula).
const nomeRepetido = (erro: unknown) => erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";

export async function novaCategoria(_estado: EstadoCategoria, dados: FormData): Promise<EstadoCategoria> {
  await exigirAcesso("painel-administracao");
  const lido = lerNomeCategoria(dados.get("nome"));
  if (!lido.ok) return { erro: lido.erro };
  const ultima = await prisma.categoria.aggregate({ _max: { ordem: true } });
  try {
    await prisma.categoria.create({ data: { nome: lido.nome, ordem: (ultima._max.ordem ?? 0) + 1 } });
  } catch (erro) {
    if (nomeRepetido(erro)) return { erro: `Já existe uma categoria "${lido.nome}".` };
    throw erro;
  }
  revalidatePath("/painel/categorias");
  return { aviso: `Categoria "${lido.nome}" incluída.` };
}

export async function salvarCategoria(_estado: EstadoCategoria, dados: FormData): Promise<EstadoCategoria> {
  await exigirAcesso("painel-administracao");
  const id = String(dados.get("id") ?? "");
  const lido = lerNomeCategoria(dados.get("nome"));
  if (!lido.ok) return { erro: lido.erro };
  try {
    const { count } = await prisma.categoria.updateMany({
      where: { id },
      data: { nome: lido.nome, ativa: dados.get("ativa") === "sim" },
    });
    if (count === 0) return { erro: "Esta categoria não existe mais." };
  } catch (erro) {
    if (nomeRepetido(erro)) return { erro: `Já existe uma categoria "${lido.nome}".` };
    throw erro;
  }
  revalidatePath("/painel/categorias");
  return { aviso: "Salvo." };
}

export type CategoriaIncluida = { ok: true; id: string; nome: string } | { ok: false; erro: string };

/**
 * Inclui uma categoria sem sair do cadastro da peça. Se já existe uma com esse
 * nome (mesmo com diferença de acento ou maiúscula), devolve a existente e a
 * coloca de volta no cadastro, para ela ser marcada.
 */
export async function incluirCategoriaNoCadastro(nomeDigitado: string): Promise<CategoriaIncluida> {
  await exigirAcesso("painel-administracao");
  const lido = lerNomeCategoria(nomeDigitado);
  if (!lido.ok) return lido;
  const existente = await prisma.categoria.findFirst({ where: { nome: lido.nome } });
  if (existente) {
    if (!existente.ativa) await prisma.categoria.update({ where: { id: existente.id }, data: { ativa: true } });
    return { ok: true, id: existente.id, nome: existente.nome };
  }
  const ultima = await prisma.categoria.aggregate({ _max: { ordem: true } });
  try {
    const criada = await prisma.categoria.create({ data: { nome: lido.nome, ordem: (ultima._max.ordem ?? 0) + 1 } });
    revalidatePath("/painel/categorias");
    return { ok: true, id: criada.id, nome: criada.nome };
  } catch (erro) {
    if (nomeRepetido(erro)) return { ok: false, erro: `Já existe uma categoria "${lido.nome}".` };
    throw erro;
  }
}
