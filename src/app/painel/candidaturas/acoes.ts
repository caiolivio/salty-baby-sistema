"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPagina } from "@/lib/acesso";
import { podeAcessar } from "@/lib/permissoes";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { lerDadosDaCandidata, mensagemDeAprovacao } from "@/lib/fornecedoras/candidatura";
import { ERRO_EMAIL_EM_USO, emailDeEntradaEmUso } from "@/lib/contas/pela-loja";
import {
  anotarCandidatura,
  aprovarCandidatura,
  atualizarCandidatura,
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

export type EstadoDadosCandidata = { erro?: string; valores?: Record<string, string> } | undefined;

/** Corrige nome, e-mail, WhatsApp e endereço da inscrição (e da conta, se a administradora). */
export async function salvarDadosDaCandidata(_estado: EstadoDadosCandidata, dados: FormData): Promise<EstadoDadosCandidata> {
  const valores = Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const id = valores.id ?? "";
  const usuario = await exigirPagina("candidaturas", "alterar", `/painel/candidaturas/${id}`);
  const lido = lerDadosDaCandidata(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  const c = await prisma.candidatura.findUnique({ where: { id }, select: { usuarioId: true } });
  if (!c) return { erro: "Esta inscrição não existe mais.", valores };
  const conta = c.usuarioId && podeAcessar(usuario.perfis, "painel-administracao") ? c.usuarioId : null;
  if (conta && (await emailDeEntradaEmUso(lido.dados.email, conta))) return { erro: ERRO_EMAIL_EM_USO, valores };
  if (!(await atualizarCandidatura(id, lido.dados, conta))) {
    return { erro: "Depois da parceria efetivada, os dados ficam na ficha da fornecedora.", valores };
  }
  redirect(`/painel/candidaturas/${id}?dados=1`);
}
