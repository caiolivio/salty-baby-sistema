"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { lerCupom } from "@/lib/cupons/regras";
import { excluirCupom, gravarCupom } from "@/lib/cupons/servidor";

// Cupons: só a administradora.

export type EstadoCupom = { erro?: string; valores?: Record<string, string> } | undefined;

const CAMPOS = [
  "id",
  "codigo",
  "tipo",
  "valor",
  "inicio",
  "fim",
  "limite",
  "minimo",
  "quem",
  "ativo",
  "clienteId",
  "marca",
  "tamanho",
  "genero",
  "fornecedoraId",
] as const;

export async function salvarCupom(_anterior: EstadoCupom, dados: FormData): Promise<EstadoCupom> {
  const usuario = await exigirAcesso("painel-administracao", "/painel/cupons");
  const valores = Object.fromEntries(CAMPOS.map((c) => [c, String(dados.get(c) ?? "")]));
  const id = valores.id || null;
  const lido = lerCupom({ ...valores, ativo: id ? valores.ativo : undefined });
  if (!lido.ok) return { erro: lido.erro, valores };
  const r = await gravarCupom(id, lido.dados, usuario.nome);
  if (!r.ok) return { erro: r.erro, valores };
  revalidatePath("/painel/cupons");
  redirect(`/painel/cupons/${r.id}?salvo=1`);
}

export async function apagarCupom(dados: FormData) {
  await exigirAcesso("painel-administracao", "/painel/cupons");
  await excluirCupom(String(dados.get("id") ?? ""));
  revalidatePath("/painel/cupons");
  redirect("/painel/cupons");
}
