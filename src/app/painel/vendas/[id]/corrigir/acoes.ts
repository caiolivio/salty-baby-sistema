"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { autorDe } from "@/lib/historico/regras";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { corrigirVenda } from "@/lib/vendas/gravar";
import { lerCorrecao } from "@/lib/vendas/regras";

export type EstadoCorrecao = { erro?: string; valores?: Record<string, string> } | undefined;

export async function corrigir(_anterior: EstadoCorrecao, dados: FormData): Promise<EstadoCorrecao> {
  const valores = Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const id = valores.id ?? "";
  const usuario = await exigirPagina("vendas", "alterar", `/painel/vendas/${id}/corrigir`);
  const venda = await prisma.venda.findUnique({
    where: { id },
    select: { itens: { select: { pecaId: true, precoUnitarioCentavos: true, quantidade: true, peca: { select: { codigo: true } } } } },
  });
  if (!venda) return { erro: "Venda não encontrada." };
  const lido = lerCorrecao(
    valores,
    venda.itens.map((i) => ({ id: i.pecaId, codigo: i.peca.codigo, precoCentavos: i.precoUnitarioCentavos * i.quantidade })),
    hojeEmSaoPaulo(),
  );
  if (!lido.ok) return { erro: lido.erro, valores };
  const r = await corrigirVenda(id, lido.dados, autorDe(usuario));
  if (!r.ok) return { erro: r.erro, valores };
  revalidatePath("/painel/vendas");
  redirect("/painel/vendas?corrigida=1");
}
