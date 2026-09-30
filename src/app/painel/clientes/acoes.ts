"use server";

import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { lerFormularioCliente } from "@/lib/clientes/dados";
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
