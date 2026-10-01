"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { incluirNoCarrinho, lerCodigoPeca, lerNomeCliente, lerTelefoneCliente, tirarDoCarrinho } from "@/lib/pedidos/regras";
import { type ClienteDaVenda, registrarVendaDireta } from "@/lib/vendas/gravar";
import { listarGruposEmUso } from "@/lib/grupos/opcoes";
import { lerVendaDireta } from "@/lib/vendas/regras";
import { gravarPecas, pecasDaVenda } from "./pecas-da-venda";

// Venda direta no painel: só a administradora (como "Confirmar pagamento").

export type EstadoIncluir = { erro?: string; ok?: string; codigo?: string } | undefined;

/** Acha a peça pelo código novo ou antigo, ou pelo endereço do QR (…/e/<código>). */
async function acharPeca(texto: string) {
  const doQr = /\/e\/([^/?#\s]+)/i.exec(texto)?.[1];
  const codigo = lerCodigoPeca(doQr ? decodeURIComponent(doQr) : texto);
  if (!codigo) return { erro: "Escreva o código da peça, por exemplo F06-00001." };
  const peca = await prisma.peca.findFirst({
    where: { OR: [{ codigo }, { codigoAntigo: codigo }] },
    select: { id: true, codigo: true, status: true, quantidade: true },
  });
  if (!peca) return { erro: `Nenhuma peça com o código ${codigo}.` };
  if (peca.status !== "publicada" || peca.quantidade < 1) return { erro: `A peça ${peca.codigo} não está à venda agora.` };
  return { peca };
}

export async function incluirNaVenda(_anterior: EstadoIncluir, dados: FormData): Promise<EstadoIncluir> {
  await exigirAcesso("painel-administracao");
  const texto = String(dados.get("codigo") ?? "").trim();
  const achado = await acharPeca(texto);
  if (!achado.peca) return { erro: achado.erro, codigo: texto };
  const atuais = await pecasDaVenda();
  if (atuais.includes(achado.peca.id)) return { erro: `A peça ${achado.peca.codigo} já está na venda.` };
  await gravarPecas(incluirNoCarrinho(atuais, achado.peca.id));
  revalidatePath("/painel/vendas/nova");
  return { ok: `Peça ${achado.peca.codigo} incluída.` };
}

/** Botão "Vender esta peça" na página da peça. */
export async function venderPeca(dados: FormData): Promise<void> {
  await exigirAcesso("painel-administracao");
  const id = String(dados.get("id") ?? "");
  await gravarPecas(incluirNoCarrinho(await pecasDaVenda(), id));
  redirect("/painel/vendas/nova");
}

export async function tirarDaVenda(dados: FormData): Promise<void> {
  await exigirAcesso("painel-administracao");
  await gravarPecas(tirarDoCarrinho(await pecasDaVenda(), String(dados.get("id") ?? "")));
  revalidatePath("/painel/vendas/nova");
}

export type EstadoVenda =
  | { erro?: string; valores?: Record<string, string> }
  | undefined;

const CAMPOS = ["canal", "grupo", "forma", "desconto", "destino", "data", "clienteId", "novaNome", "novaTelefone"] as const;

export async function registrarVenda(_anterior: EstadoVenda, dados: FormData): Promise<EstadoVenda> {
  await exigirAcesso("painel-administracao");
  const valores = Object.fromEntries(CAMPOS.map((c) => [c, String(dados.get(c) ?? "")]));
  const ids = await pecasDaVenda();
  if (ids.length === 0) return { erro: "Inclua pelo menos uma peça na venda.", valores };
  const precos = await prisma.peca.findMany({ where: { id: { in: ids } }, select: { precoCentavos: true } });
  const total = precos.reduce((s, p) => s + p.precoCentavos, 0);
  const hoje = hojeEmSaoPaulo();
  const lido = lerVendaDireta(valores, total, hoje, await listarGruposEmUso());
  if (!lido.ok) return { erro: lido.erro, valores };

  let cliente: ClienteDaVenda = null;
  if (valores.clienteId === "nova") {
    const nome = lerNomeCliente(valores.novaNome);
    if (!nome) return { erro: "Escreva o nome da nova cliente.", valores };
    const telefone = valores.novaTelefone.trim() ? lerTelefoneCliente(valores.novaTelefone) : null;
    if (telefone === undefined) return { erro: "O WhatsApp precisa ter DDD, por exemplo (12) 98105-3623.", valores };
    cliente = { nova: { nome, telefone } };
  } else if (valores.clienteId) {
    const existe = await prisma.cliente.findUnique({ where: { id: valores.clienteId }, select: { id: true } });
    if (!existe) return { erro: "Cliente do cadastro não encontrada.", valores };
    cliente = { id: existe.id };
  }

  const resultado = await registrarVendaDireta(ids, lido.dados, cliente);
  if (!resultado.ok) return { erro: resultado.erro, valores };
  await gravarPecas([]);
  revalidatePath("/painel/vendas");
  redirect("/painel/vendas?registrada=1");
}
