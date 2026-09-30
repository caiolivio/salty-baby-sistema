"use server";

import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { lerFormularioFornecedora } from "@/lib/fornecedoras/dados";
import { atualizarFornecedora, criarFornecedora } from "@/lib/fornecedoras/gravar";

export type EstadoFornecedora = { erro?: string; valores?: Record<string, string> } | undefined;

const valoresDigitados = (dados: FormData) =>
  Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

export async function novaFornecedora(_estado: EstadoFornecedora, dados: FormData): Promise<EstadoFornecedora> {
  await exigirAcesso("painel-administracao");
  const valores = valoresDigitados(dados);
  const lido = lerFormularioFornecedora(valores);
  if (!lido.ok) return { erro: lido.erro, valores };

  const { id } = await criarFornecedora(lido.dados);
  redirect(`/painel/fornecedoras/${id}?criada=1`);
}

export async function salvarFornecedora(_estado: EstadoFornecedora, dados: FormData): Promise<EstadoFornecedora> {
  await exigirAcesso("painel-administracao");
  const valores = valoresDigitados(dados);
  const id = valores.id ?? "";
  const atual = await prisma.fornecedora.findUnique({ where: { id }, select: { documento: true } });
  if (!atual) return { erro: "Esta fornecedora não existe mais.", valores };
  const lido = lerFormularioFornecedora(valores, atual.documento);
  if (!lido.ok) return { erro: lido.erro, valores };

  const ok = await atualizarFornecedora(id, { ...lido.dados, ativa: valores.ativa === "sim" });
  if (!ok) return { erro: "Esta fornecedora não existe mais.", valores };
  redirect(`/painel/fornecedoras/${id}?salva=1`);
}
