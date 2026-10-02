"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPagina } from "@/lib/acesso";
import { gravarDivulgacao, pecasDaDivulgacao } from "./lista-da-divulgacao";

// Monta a lista de peças da divulgação do WhatsApp Marketing.

export async function incluirNaDivulgacao(dados: FormData) {
  await exigirPagina("marketing", "ver");
  const novas = dados.getAll("id").map(String);
  await gravarDivulgacao([...(await pecasDaDivulgacao()), ...novas]);
  revalidatePath("/painel/marketing");
  // Vindo da página da peça, vai direto para a divulgação.
  if (dados.get("ir") === "sim") redirect("/painel/marketing#lista");
}

export async function tirarDaDivulgacao(dados: FormData) {
  await exigirPagina("marketing", "ver");
  const id = String(dados.get("id") ?? "");
  await gravarDivulgacao((await pecasDaDivulgacao()).filter((x) => x !== id));
  revalidatePath("/painel/marketing");
}

export async function limparDivulgacao() {
  await exigirPagina("marketing", "ver");
  await gravarDivulgacao([]);
  revalidatePath("/painel/marketing");
}
