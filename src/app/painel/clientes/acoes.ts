"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { lerCrianca, lerFormularioCliente } from "@/lib/clientes/dados";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerTelefoneCliente } from "@/lib/pedidos/regras";
import { podeAcessar } from "@/lib/permissoes";

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
  const usuario = await exigirAcesso("painel");
  const valores = valoresDigitados(dados);
  const lido = lerFormularioCliente(valores, {}, podeAcessar(usuario.perfis, "painel-administracao"));
  if (!lido.ok) return { erro: lido.erro, valores };
  const repetida = await mesmoWhatsapp(lido.dados.telefone);
  if (repetida) return { erro: `${repetida.nome} já está cadastrada com este WhatsApp.`, valores };

  const { id } = await prisma.cliente.create({ data: lido.dados });
  redirect(`/painel/clientes/${id}?criada=1`);
}

export async function salvarCliente(_estado: EstadoCliente, dados: FormData): Promise<EstadoCliente> {
  const usuario = await exigirAcesso("painel");
  const valores = valoresDigitados(dados);
  const id = valores.id ?? "";
  const atual = await prisma.cliente.findUnique({ where: { id }, select: { telefone: true, cpf: true } });
  if (!atual) return { erro: "Esta cliente não existe mais.", valores };
  const lido = lerFormularioCliente(valores, atual, podeAcessar(usuario.perfis, "painel-administracao"));
  if (!lido.ok) return { erro: lido.erro, valores };
  const repetida = lido.dados.telefone !== atual.telefone ? await mesmoWhatsapp(lido.dados.telefone, id) : undefined;
  if (repetida) return { erro: `${repetida.nome} já está cadastrada com este WhatsApp.`, valores };

  await prisma.cliente.update({ where: { id }, data: lido.dados });
  redirect(`/painel/clientes/${id}?salva=1`);
}

export type EstadoCrianca = { erro?: string; ok?: string; valores?: Record<string, string> } | undefined;

/** Inclui ou altera uma criança da cliente (sem id, inclui). */
export async function gravarCrianca(_estado: EstadoCrianca, dados: FormData): Promise<EstadoCrianca> {
  await exigirAcesso("painel");
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
  await exigirAcesso("painel");
  const clienteId = String(dados.get("clienteId") ?? "");
  await prisma.crianca.deleteMany({ where: { id: String(dados.get("id") ?? ""), clienteId } });
  revalidatePath(`/painel/clientes/${clienteId}`);
}
