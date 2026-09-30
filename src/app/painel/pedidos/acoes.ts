"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { encerrarPedido, incluirPecaNoPedido, tirarPecaDoPedido } from "@/lib/pedidos/gravar";
import { lerCodigoPeca, lerNomeCliente, lerTelefoneCliente } from "@/lib/pedidos/regras";
import { confirmarPagamento } from "@/lib/vendas/gravar";
import { lerConfirmacao } from "@/lib/vendas/regras";

/** Cancela um pedido reservado: as peças voltam na hora para a vitrine. */
export async function cancelarPedido(dados: FormData): Promise<void> {
  await exigirAcesso("painel");
  const id = String(dados.get("id") ?? "");
  await encerrarPedido(id, "cancelado");
  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${id}`);
}

export type EstadoConfirmar = { erro?: string; forma?: string; desconto?: string; destino?: string } | undefined;

/** Confirmar pagamento: só a administradora (CLAUDE.md, "Pedido, reserva e pagamento"). */
export async function confirmar(_anterior: EstadoConfirmar, dados: FormData): Promise<EstadoConfirmar> {
  await exigirAcesso("painel-administracao");
  const id = String(dados.get("id") ?? "");
  const pedido = await prisma.pedido.findUnique({ where: { id }, select: { totalCentavos: true } });
  if (!pedido) return { erro: "Pedido não encontrado." };
  const lido = lerConfirmacao(
    { forma: dados.get("forma"), desconto: dados.get("desconto"), destino: dados.get("destino") },
    pedido.totalCentavos,
  );
  // Devolve o que foi digitado, para o formulário não voltar vazio depois de um erro.
  const digitado = {
    forma: String(dados.get("forma") ?? ""),
    desconto: String(dados.get("desconto") ?? ""),
    destino: String(dados.get("destino") ?? ""),
  };
  if (!lido.ok) return { erro: lido.erro, ...digitado };
  const resultado = await confirmarPagamento(id, lido.dados, hojeEmSaoPaulo());
  if (!resultado.ok) return { erro: resultado.erro, ...digitado };
  revalidatePath("/painel/pedidos");
  revalidatePath("/painel/vendas");
  redirect(`/painel/pedidos/${id}?pago=1`);
}

export type EstadoEdicao = { erro?: string; ok?: string; codigo?: string } | undefined;

function atualizar(id: string) {
  revalidatePath("/painel/pedidos");
  revalidatePath(`/painel/pedidos/${id}`);
  revalidatePath(`/painel/pedidos/${id}/confirmar`);
}

/** Inclui uma peça no pedido pelo código (novo ou antigo). */
export async function incluirPeca(_anterior: EstadoEdicao, dados: FormData): Promise<EstadoEdicao> {
  await exigirAcesso("painel");
  const id = String(dados.get("id") ?? "");
  const digitado = String(dados.get("codigo") ?? "");
  const codigo = lerCodigoPeca(digitado);
  if (!codigo) return { erro: "Escreva o código da peça, por exemplo F06-00001.", codigo: digitado };
  const r = await incluirPecaNoPedido(id, codigo);
  if (!r.ok) return { erro: r.erro, codigo: digitado };
  atualizar(id);
  return { ok: `Peça ${codigo} incluída.` };
}

/** Tira uma peça do pedido (ela volta para a vitrine se estava reservada). */
export async function tirarPeca(_anterior: EstadoEdicao, dados: FormData): Promise<EstadoEdicao> {
  await exigirAcesso("painel");
  const id = String(dados.get("id") ?? "");
  const r = await tirarPecaDoPedido(id, String(dados.get("pecaId") ?? ""));
  if (!r.ok) return { erro: r.erro };
  atualizar(id);
  return { ok: "Peça tirada do pedido." };
}

export type EstadoCliente = { erro?: string; ok?: boolean; nome?: string; telefone?: string; clienteId?: string; observacao?: string } | undefined;

/** Corrige nome e WhatsApp, liga o pedido a uma cliente do cadastro e guarda observações. */
export async function salvarCliente(_anterior: EstadoCliente, dados: FormData): Promise<EstadoCliente> {
  await exigirAcesso("painel");
  const id = String(dados.get("id") ?? "");
  const digitado = {
    nome: String(dados.get("nome") ?? ""),
    telefone: String(dados.get("telefone") ?? ""),
    clienteId: String(dados.get("clienteId") ?? ""),
    observacao: String(dados.get("observacao") ?? ""),
  };
  const nome = lerNomeCliente(digitado.nome);
  if (!nome) return { erro: "Escreva o nome da cliente.", ...digitado };
  const telefone = digitado.telefone.trim() ? lerTelefoneCliente(digitado.telefone) : null;
  if (telefone === undefined) return { erro: "O WhatsApp precisa ter DDD, por exemplo (12) 98105-3623.", ...digitado };
  const observacao = digitado.observacao.trim().slice(0, 2000) || null;

  let clienteId: string | null = null;
  if (digitado.clienteId === "nova") {
    const nova = await prisma.cliente.create({ data: { nome, telefone } });
    clienteId = nova.id;
  } else if (digitado.clienteId) {
    const existe = await prisma.cliente.findUnique({ where: { id: digitado.clienteId }, select: { id: true } });
    if (!existe) return { erro: "Cliente do cadastro não encontrada.", ...digitado };
    clienteId = existe.id;
  }
  const pedido = await prisma.pedido.findUnique({ where: { id }, select: { vendaId: true } });
  if (!pedido) return { erro: "Pedido não encontrado." };
  await prisma.$transaction([
    prisma.pedido.update({ where: { id }, data: { nomeCliente: nome, telefoneCliente: telefone, clienteId, observacao } }),
    // Se o pedido já virou venda, a venda acompanha a cliente escolhida.
    ...(pedido.vendaId ? [prisma.venda.update({ where: { id: pedido.vendaId }, data: { clienteId } })] : []),
  ]);
  atualizar(id);
  return { ok: true };
}
