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
