"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { encerrarPedido } from "@/lib/pedidos/gravar";
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
  redirect(`/painel/pedidos/${id}?pago=1`);
}
