"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPagina } from "@/lib/acesso";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { mensagemDeAprovacao } from "@/lib/fornecedoras/candidatura";
import {
  anotarCandidatura,
  aprovarCandidatura,
  efetivarCandidatura,
  receberProposta,
  recusarCandidatura,
  recusarProposta,
} from "@/lib/fornecedoras/candidaturas";
import { prisma } from "@/lib/banco";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import { autorDe } from "@/lib/historico/regras";
import { lerLoja } from "@/lib/loja/servidor";

// Curadoria das candidatas a fornecedora. Só a administradora decide.

const textoDe = (dados: FormData, campo: string) => String(dados.get(campo) ?? "").trim();

export type EstadoAprovacao = { erro?: string; link?: string; whatsapp?: string; novaConta?: boolean } | undefined;

/** Aprova o passo 1 (ou gera um link novo) e devolve o link para mandar no WhatsApp. */
export async function aprovar(_estado: EstadoAprovacao, dados: FormData): Promise<EstadoAprovacao> {
  const id = textoDe(dados, "id");
  await exigirPagina("candidaturas", "alterar", `/painel/candidaturas/${id}`);
  const r = await aprovarCandidatura(id);
  if (!r.ok) {
    return {
      erro:
        r.motivo === "nao-encontrada"
          ? "Esta inscrição não existe mais."
          : r.motivo === "etapa"
            ? "Esta inscrição já foi encerrada."
            : "Este e-mail já é de outra fornecedora ou de outra inscrição. Confira com ela.",
    };
  }
  const c = await prisma.candidatura.findUniqueOrThrow({ where: { id }, select: { nome: true, telefone: true } });
  const link = `${origemDaRequisicao(await headers()).replace(/\/+$/, "")}/criar-senha/${r.codigo}`;
  const tel = lerTelefoneCliente(c.telefone);
  const whatsapp = tel
    ? `${linkWhatsappCliente(tel)}?text=${encodeURIComponent(mensagemDeAprovacao(c.nome, link, r.novaConta, (await lerLoja()).nome))}`
    : undefined;
  refresh();
  return { link, whatsapp, novaConta: r.novaConta };
}

export async function recusar(dados: FormData): Promise<void> {
  const id = textoDe(dados, "id");
  await exigirPagina("candidaturas", "alterar", `/painel/candidaturas/${id}`);
  await recusarCandidatura(id, textoDe(dados, "observacao") || null);
  redirect(`/painel/candidaturas/${id}?recusada=1`);
}

export async function anotar(dados: FormData): Promise<void> {
  const id = textoDe(dados, "id");
  await exigirPagina("candidaturas", "alterar", `/painel/candidaturas/${id}`);
  await anotarCandidatura(id, textoDe(dados, "observacao").slice(0, 2000) || null);
  redirect(`/painel/candidaturas/${id}?anotada=1`);
}

/** Passo 3: cria a fornecedora (com o próximo código) ligada à conta dela. */
export async function efetivar(dados: FormData): Promise<void> {
  const id = textoDe(dados, "id");
  await exigirPagina("candidaturas", "alterar", `/painel/candidaturas/${id}`);
  const r = await efetivarCandidatura(id);
  redirect(`/painel/candidaturas/${id}?${r.ok ? `efetivada=${r.codigo}` : `erro=${r.motivo}`}`);
}

/** A peça proposta chegou na loja: vira peça do estoque (rascunho) e abre para pôr o preço. */
export async function receber(dados: FormData): Promise<void> {
  const id = textoDe(dados, "id");
  const voltar = textoDe(dados, "voltar") || "/painel/candidaturas";
  const usuario = await exigirPagina("candidaturas", "alterar", voltar);
  const r = await receberProposta(id, hojeEmSaoPaulo(), autorDe(usuario));
  if (r.ok) redirect(`/painel/pecas/${r.pecaId}?criada=1`);
  redirect(`${voltar}?erro=${r.motivo}`);
}

export async function recusarPeca(dados: FormData): Promise<void> {
  const id = textoDe(dados, "id");
  const voltar = textoDe(dados, "voltar") || "/painel/candidaturas";
  await exigirPagina("candidaturas", "alterar", voltar);
  await recusarProposta(id);
  refresh();
}
