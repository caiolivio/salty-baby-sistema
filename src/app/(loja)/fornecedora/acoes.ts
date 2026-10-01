"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { exigirAcesso } from "@/lib/acesso";
import { lerProposta } from "@/lib/fornecedoras/candidatura";
import {
  aceitarAcordo,
  marcarBoasVindas,
  registrarProposta,
  situacaoNaArea,
  tirarProposta,
} from "@/lib/fornecedoras/candidaturas";

// Ações da área da fornecedora. Cada uma confere o login e só mexe nos dados
// de quem está logada.

/** De quem são as peças propostas por quem está logada (candidata ou fornecedora). */
async function donoDasPropostas() {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const situacao = await situacaoNaArea(usuario.id);
  if (situacao.tipo === "fornecedora" && situacao.fornecedora.ativa) {
    return { fornecedoraId: situacao.fornecedora.id };
  }
  if (situacao.tipo === "candidata" && ["aprovada", "acordo_aceito"].includes(situacao.candidatura.etapa)) {
    return { candidaturaId: situacao.candidatura.id };
  }
  return null;
}

export type EstadoProposta = { erro?: string; ok?: string; valores?: Record<string, string> } | undefined;

export async function enviarProposta(_estado: EstadoProposta, dados: FormData): Promise<EstadoProposta> {
  const dono = await donoDasPropostas();
  if (!dono) return { erro: "Sua área ainda não está liberada para enviar peças." };
  const valores = Object.fromEntries(
    [...dados.entries()].filter((par): par is [string, string] => typeof par[1] === "string"),
  );
  const foto = dados.get("foto");
  const temFoto = foto instanceof File && foto.size > 0;
  const lido = lerProposta(valores, temFoto);
  if (!lido.ok) return { erro: lido.erro, valores };
  try {
    await registrarProposta(dono, lido.dados, Buffer.from(await (foto as File).arrayBuffer()));
  } catch (erro) {
    console.error("Falha ao gravar a peça proposta:", erro);
    return { erro: "A foto não abriu. Tire ou escolha a foto de novo.", valores };
  }
  refresh();
  return { ok: `"${lido.dados.nome}" enviada para a Salty avaliar.` };
}

export async function tirar(dados: FormData): Promise<void> {
  const dono = await donoDasPropostas();
  if (dono) await tirarProposta(String(dados.get("id") ?? ""), dono);
  refresh();
}

export async function aceitar(dados: FormData): Promise<void> {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const situacao = await situacaoNaArea(usuario.id);
  if (dados.get("de_acordo") !== "sim") redirect("/fornecedora?faltaAceite=1");
  if (situacao.tipo === "candidata") await aceitarAcordo(situacao.candidatura.id);
  redirect("/fornecedora");
}

export async function concluirBoasVindas(): Promise<void> {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const situacao = await situacaoNaArea(usuario.id);
  if (situacao.tipo === "fornecedora") await marcarBoasVindas(situacao.fornecedora.id);
  redirect("/fornecedora");
}

export async function sair(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
