"use server";

import { refresh, revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAcesso, exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { mensagemDoLink } from "@/lib/clientes/conta";
import { criarAcessoPelaLoja } from "@/lib/clientes/contas";
import { lerCrianca, lerFormularioCliente } from "@/lib/clientes/dados";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import { podeAcessar } from "@/lib/permissoes";
import { normalizarEmail } from "@/lib/senha";
import { registrar, registrarCadastro } from "@/lib/historico/gravar";
import { CAMPOS_CLIENTE, autorDe, compararParcial } from "@/lib/historico/regras";
import { lerLoja } from "@/lib/loja/servidor";

export type EstadoCliente = { erro?: string; valores?: Record<string, string> } | undefined;

const valoresDigitados = (dados: FormData) =>
  Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

/** Outra cliente com o mesmo WhatsApp, para não cadastrar a mesma pessoa duas vezes. */
async function mesmoWhatsapp(telefone: string | null, exceto?: string) {
  const digitos = lerTelefoneCliente(telefone);
  if (!digitos) return undefined;
  const comTelefone = await prisma.cliente.findMany({
    where: { telefone: { not: null }, ...(exceto ? { id: { not: exceto } } : {}) },
    select: { nome: true, telefone: true },
  });
  return comTelefone.find((c) => lerTelefoneCliente(c.telefone) === digitos);
}

export async function novaCliente(_estado: EstadoCliente, dados: FormData): Promise<EstadoCliente> {
  const usuario = await exigirPagina("clientes", "alterar");
  const valores = valoresDigitados(dados);
  const lido = lerFormularioCliente(valores, {}, podeAcessar(usuario.perfis, "painel-administracao"));
  if (!lido.ok) return { erro: lido.erro, valores };
  const repetida = await mesmoWhatsapp(lido.dados.telefone);
  if (repetida) return { erro: `${repetida.nome} já está cadastrada com este WhatsApp.`, valores };

  const { id } = await prisma.cliente.create({ data: lido.dados });
  await registrarCadastro(prisma, { tabela: "cliente", id, rotulo: lido.dados.nome }, "Cadastrada no painel", autorDe(usuario));
  redirect(`/painel/clientes/${id}?criada=1`);
}

export async function salvarCliente(_estado: EstadoCliente, dados: FormData): Promise<EstadoCliente> {
  const usuario = await exigirPagina("clientes", "alterar");
  const valores = valoresDigitados(dados);
  const id = valores.id ?? "";
  const atual = await prisma.cliente.findUnique({ where: { id } });
  if (!atual) return { erro: "Esta cliente não existe mais.", valores };
  const lido = lerFormularioCliente(valores, atual, podeAcessar(usuario.perfis, "painel-administracao"));
  if (!lido.ok) return { erro: lido.erro, valores };
  const repetida = lido.dados.telefone !== atual.telefone ? await mesmoWhatsapp(lido.dados.telefone, id) : undefined;
  if (repetida) return { erro: `${repetida.nome} já está cadastrada com este WhatsApp.`, valores };

  await prisma.$transaction(async (tx) => {
    await tx.cliente.update({ where: { id }, data: lido.dados });
    await registrar(
      tx,
      { tabela: "cliente", id, rotulo: lido.dados.nome },
      compararParcial(CAMPOS_CLIENTE, atual, lido.dados),
      autorDe(usuario),
      "Edição no painel",
    );
  });
  redirect(`/painel/clientes/${id}?salva=1`);
}

export type EstadoCrianca = { erro?: string; ok?: string; valores?: Record<string, string> } | undefined;

/** Inclui ou altera uma criança da cliente (sem id, inclui). */
export async function gravarCrianca(_estado: EstadoCrianca, dados: FormData): Promise<EstadoCrianca> {
  await exigirPagina("clientes", "alterar");
  const valores = valoresDigitados(dados);
  const lido = lerCrianca(valores, hojeEmSaoPaulo());
  if (!lido.ok) return { erro: lido.erro, valores };
  const clienteId = valores.clienteId ?? "";
  if (valores.id) {
    const r = await prisma.crianca.updateMany({ where: { id: valores.id, clienteId }, data: lido.dados });
    if (r.count === 0) return { erro: "Esta criança não existe mais.", valores };
  } else {
    const existe = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
    if (!existe) return { erro: "Esta cliente não existe mais.", valores };
    await prisma.crianca.create({ data: { ...lido.dados, clienteId } });
  }
  revalidatePath(`/painel/clientes/${clienteId}`);
  return { ok: valores.id ? "Dados da criança salvos." : `${lido.dados.nome} foi incluída.` };
}

export async function removerCrianca(dados: FormData): Promise<void> {
  await exigirPagina("clientes", "alterar");
  const clienteId = String(dados.get("clienteId") ?? "");
  await prisma.crianca.deleteMany({ where: { id: String(dados.get("id") ?? ""), clienteId } });
  revalidatePath(`/painel/clientes/${clienteId}`);
}

export type EstadoAcesso = { erro?: string; link?: string; whatsapp?: string; novaConta?: boolean } | undefined;

/**
 * Cria o acesso da cliente ao site (ou um link novo, para quem esqueceu a
 * senha). O link de criar senha aparece uma vez só, para mandar no WhatsApp.
 */
export async function liberarAcesso(_estado: EstadoAcesso, dados: FormData): Promise<EstadoAcesso> {
  const id = String(dados.get("id") ?? "");
  await exigirAcesso("painel-administracao", `/painel/clientes/${id}`);
  const email = normalizarEmail(String(dados.get("email") ?? ""));
  if (!z.email().safeParse(email).success) return { erro: "Confira o e-mail da cliente." };

  const r = await criarAcessoPelaLoja(id, email);
  if (!r.ok) {
    return {
      erro: r.motivo === "sem-cliente" ? "Esta cliente não existe mais." : "Este e-mail já é a conta de outra cliente.",
    };
  }
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id }, select: { nome: true, telefone: true } });
  const link = `${origemDaRequisicao(await headers()).replace(/\/+$/, "")}/criar-senha/${r.codigo}`;
  const tel = lerTelefoneCliente(cliente.telefone);
  const whatsapp = tel
    ? `${linkWhatsappCliente(tel)}?text=${encodeURIComponent(mensagemDoLink(cliente.nome, link, r.novaConta, (await lerLoja()).nome))}`
    : undefined;
  refresh();
  return { link, whatsapp, novaConta: r.novaConta };
}
