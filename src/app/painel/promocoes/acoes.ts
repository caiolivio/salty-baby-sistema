"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerCodigos, lerPromocao } from "@/lib/promocoes/regras";
import { criarPromocao, excluirPromocao, incluirPecas, salvarPromocao, tirarPeca } from "@/lib/promocoes/servidor";

// Promoções: só a administradora.

export type EstadoPromocao = { erro?: string; valores?: Record<string, string> } | undefined;

const CAMPOS = ["id", "nome", "tipo", "valor", "inicio", "fim", "quem", "ativa", "codigos"] as const;
const texto = (dados: FormData, campo: string) => {
  const v = dados.get(campo);
  return typeof v === "string" ? v : "";
};

/** Cria ou salva a promoção (com o campo `id`), e inclui as peças dos códigos digitados. */
export async function gravarPromocao(_anterior: EstadoPromocao, dados: FormData): Promise<EstadoPromocao> {
  const usuario = await exigirAcesso("painel-administracao", "/painel/promocoes");
  const valores = Object.fromEntries(CAMPOS.map((c) => [c, texto(dados, c)]));
  const id = valores.id;
  const lido = lerPromocao({ ...valores, ativa: id ? valores.ativa : undefined }, hojeEmSaoPaulo());
  if (!lido.ok) return { erro: lido.erro, valores };
  const promocaoId = id ? (await salvarPromocao(id, lido.dados, usuario.nome), id) : await criarPromocao(lido.dados, usuario.nome);
  const { naoAchados } = await incluirPecas(promocaoId, lerCodigos(valores.codigos));
  revalidatePath("/", "layout");
  const aviso = naoAchados.length > 0 ? `?nao_achados=${encodeURIComponent(naoAchados.join(" "))}` : "?salvo=1";
  redirect(`/painel/promocoes/${promocaoId}${aviso}`);
}

export async function incluirNaPromocao(dados: FormData) {
  await exigirAcesso("painel-administracao", "/painel/promocoes");
  const id = texto(dados, "id");
  const { incluidas, naoAchados } = await incluirPecas(id, lerCodigos(texto(dados, "codigos")));
  revalidatePath("/", "layout");
  const partes = [`incluidas=${incluidas}`, naoAchados.length > 0 && `nao_achados=${encodeURIComponent(naoAchados.join(" "))}`];
  redirect(`/painel/promocoes/${id}?${partes.filter(Boolean).join("&")}#pecas`);
}

export async function tirarDaPromocao(dados: FormData) {
  await exigirAcesso("painel-administracao", "/painel/promocoes");
  const id = texto(dados, "id");
  await tirarPeca(id, texto(dados, "pecaId"));
  revalidatePath("/", "layout");
  redirect(`/painel/promocoes/${id}#pecas`);
}

export async function apagarPromocao(dados: FormData) {
  await exigirAcesso("painel-administracao", "/painel/promocoes");
  await excluirPromocao(texto(dados, "id"));
  revalidatePath("/", "layout");
  redirect("/painel/promocoes");
}
