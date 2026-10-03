import "server-only";
import type { UsuarioLogado } from "@/lib/usuarios";
import { prisma } from "@/lib/banco";
import { lerPedidoDeCredito } from "@/lib/fornecedoras/credito";
import { temExtra } from "@/lib/permissoes";

/** Lê "Pagar com o saldo de uma fornecedora". O saldo é repasse: só quem vê os valores usa. */
export async function lerCreditoDoFormulario(valores: Record<string, string>, usuario: UsuarioLogado) {
  if (valores.credito_fornecedora && !temExtra(usuario.acesso, "valores")) {
    return { ok: false as const, erro: "Só quem vê os valores das fornecedoras pode usar o saldo delas." };
  }
  const id = valores.credito_fornecedora;
  const fornecedoras = id ? await prisma.fornecedora.findMany({ where: { id }, select: { id: true } }) : [];
  return lerPedidoDeCredito(valores, fornecedoras);
}
