"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { codigoDoGrupo, lerNomeGrupo, lerPapelGrupo } from "@/lib/grupos/regras";

export type EstadoGrupo = { erro?: string; aviso?: string } | undefined;

const repetido = (erro: unknown) => erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";

export async function novoGrupo(_estado: EstadoGrupo, dados: FormData): Promise<EstadoGrupo> {
  await exigirAcesso("painel-administracao");
  const lido = lerNomeGrupo(dados.get("nome"));
  if (!lido.ok) return { erro: lido.erro };
  const ultimo = await prisma.grupoWhatsapp.aggregate({ _max: { ordem: true } });
  // A marca do link nasce do nome e não muda depois; se já existe, ganha um número.
  const base = codigoDoGrupo(lido.nome);
  let codigo = base;
  for (let n = 2; await prisma.grupoWhatsapp.findUnique({ where: { codigo } }); n++) codigo = `${base.slice(0, 36)}-${n}`;
  try {
    await prisma.grupoWhatsapp.create({
      data: { nome: lido.nome, codigo, papel: lerPapelGrupo(dados.get("papel")), ordem: (ultimo._max.ordem ?? 0) + 1 },
    });
  } catch (erro) {
    if (repetido(erro)) return { erro: `Já existe um grupo "${lido.nome}".` };
    throw erro;
  }
  revalidatePath("/painel/marketing/grupos");
  return { aviso: `Grupo "${lido.nome}" incluído.` };
}

export async function salvarGrupo(_estado: EstadoGrupo, dados: FormData): Promise<EstadoGrupo> {
  await exigirAcesso("painel-administracao");
  const id = String(dados.get("id") ?? "");
  const lido = lerNomeGrupo(dados.get("nome"));
  if (!lido.ok) return { erro: lido.erro };
  try {
    const { count } = await prisma.grupoWhatsapp.updateMany({
      where: { id },
      data: { nome: lido.nome, papel: lerPapelGrupo(dados.get("papel")), ativo: dados.get("ativo") === "sim" },
    });
    if (count === 0) return { erro: "Este grupo não existe mais." };
  } catch (erro) {
    if (repetido(erro)) return { erro: `Já existe um grupo "${lido.nome}".` };
    throw erro;
  }
  revalidatePath("/painel/marketing/grupos");
  return { aviso: "Salvo." };
}
