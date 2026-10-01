"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { lerFormularioFornecedora } from "@/lib/fornecedoras/dados";
import { atualizarFornecedora, criarFornecedora } from "@/lib/fornecedoras/gravar";
import { mensagemDoLink } from "@/lib/clientes/conta";
import { mensagemDoConvite } from "@/lib/fornecedoras/conta";
import { gerarAcessoDaFornecedora } from "@/lib/fornecedoras/convites";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";

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

export type EstadoAcesso = { erro?: string; link?: string; whatsapp?: string; tipo?: "convite" | "nova-senha" } | undefined;

/** Link para a fornecedora entrar na área dela: primeiro acesso (sem conta) ou nova senha. */
export async function gerarAcesso(_estado: EstadoAcesso, dados: FormData): Promise<EstadoAcesso> {
  const id = String(dados.get("id") ?? "");
  await exigirAcesso("painel-administracao", `/painel/fornecedoras/${id}`);
  const r = await gerarAcessoDaFornecedora(id);
  if (!r.ok) return { erro: "Fornecedora inativa ou não encontrada. Ative o cadastro dela antes." };
  const f = await prisma.fornecedora.findUniqueOrThrow({ where: { id }, select: { nome: true, telefone: true } });
  const origem = origemDaRequisicao(await headers()).replace(/\/+$/, "");
  const link = `${origem}/${r.tipo === "convite" ? "convite" : "criar-senha"}/${r.codigo}`;
  const tel = lerTelefoneCliente(f.telefone);
  const texto = r.tipo === "convite" ? mensagemDoConvite(f.nome, link) : mensagemDoLink(f.nome, link, false);
  refresh();
  return { link, tipo: r.tipo, whatsapp: tel ? `${linkWhatsappCliente(tel)}?text=${encodeURIComponent(texto)}` : undefined };
}
