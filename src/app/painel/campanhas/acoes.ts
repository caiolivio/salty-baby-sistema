"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { lerCampanha } from "@/lib/campanhas/regras";
import { excluirCampanha, gravarCampanha } from "@/lib/campanhas/servidor";

// Campanhas de lançamento: só a administradora.

export type EstadoCampanha = { erro?: string; valores?: Record<string, string>; tamanhos?: string[] } | undefined;

const CAMPOS = ["id", "nome", "codigo", "titulo", "texto", "faixa", "ate", "cupom", "ativa"] as const;

export async function salvarCampanha(_anterior: EstadoCampanha, dados: FormData): Promise<EstadoCampanha> {
  const usuario = await exigirAcesso("painel-administracao", "/painel/campanhas");
  const valores = Object.fromEntries(CAMPOS.map((c) => [c, String(dados.get(c) ?? "")]));
  const tamanhos = dados.getAll("tamanhos").map(String);
  const lido = lerCampanha(valores, tamanhos);
  if (!lido.ok) return { erro: lido.erro, valores, tamanhos };
  const r = await gravarCampanha(valores.id || null, lido.dados, usuario.nome);
  if (!r.ok) return { erro: r.erro, valores, tamanhos };
  revalidatePath("/", "layout");
  redirect(`/painel/campanhas/${r.id}?salvo=1`);
}

export async function apagarCampanha(dados: FormData) {
  await exigirAcesso("painel-administracao", "/painel/campanhas");
  await excluirCampanha(String(dados.get("id") ?? ""));
  revalidatePath("/", "layout");
  redirect("/painel/campanhas");
}
