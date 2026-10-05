"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirAcesso, exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { lerFormularioFornecedora, mostrarPercentual } from "@/lib/fornecedoras/dados";
import { temExtra, type Acesso } from "@/lib/permissoes";
import { atualizarFornecedora, criarFornecedora } from "@/lib/fornecedoras/gravar";
import { mensagemDoLink } from "@/lib/clientes/conta";
import { mensagemDoConvite } from "@/lib/fornecedoras/conta";
import { gerarAcessoDaFornecedora } from "@/lib/fornecedoras/convites";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import { registrarCadastro } from "@/lib/historico/gravar";
import { autorDe } from "@/lib/historico/regras";
import { lerLoja } from "@/lib/loja/servidor";

export type EstadoFornecedora = { erro?: string; valores?: Record<string, string> } | undefined;

const valoresDigitados = (dados: FormData) =>
  Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

/**
 * O suporte não vê CPF/CNPJ e Pix (só a administradora) nem, sem "Ver custo,
 * repasse e lucro", o repasse padrão: esses campos ficam como estavam.
 */
function manterProtegidos(
  valores: Record<string, string>,
  acesso: Acesso,
  atual: {
    documento: string | null;
    pix: string | null;
    pixTipo?: string | null;
    recebimentoPreferido?: string | null;
    percentualRepassePadrao: number;
  },
) {
  if (!acesso.administradora) {
    valores.documento = atual.documento ?? "";
    valores.pix = atual.pix ?? "";
    valores.pixTipo = atual.pixTipo ?? "";
    valores.recebimentoPreferido = atual.recebimentoPreferido ?? "";
  }
  if (!temExtra(acesso, "valores")) valores.percentualRepassePadrao = mostrarPercentual(atual.percentualRepassePadrao);
}

export async function novaFornecedora(_estado: EstadoFornecedora, dados: FormData): Promise<EstadoFornecedora> {
  const usuario = await exigirPagina("fornecedoras", "alterar");
  const valores = valoresDigitados(dados);
  const { repassePadrao } = await lerLoja();
  manterProtegidos(valores, usuario.acesso, { documento: null, pix: null, percentualRepassePadrao: repassePadrao });
  const lido = lerFormularioFornecedora(valores, undefined, repassePadrao);
  if (!lido.ok) return { erro: lido.erro, valores };

  const { id, codigo } = await criarFornecedora(lido.dados);
  await registrarCadastro(prisma, { tabela: "fornecedora", id, rotulo: `${codigo} · ${lido.dados.nome}` }, "Cadastrada no painel", autorDe(usuario));
  redirect(`/painel/fornecedoras/${id}?criada=1`);
}

export async function salvarFornecedora(_estado: EstadoFornecedora, dados: FormData): Promise<EstadoFornecedora> {
  const usuario = await exigirPagina("fornecedoras", "alterar");
  const valores = valoresDigitados(dados);
  const id = valores.id ?? "";
  const atual = await prisma.fornecedora.findUnique({
    where: { id },
    select: { documento: true, pix: true, pixTipo: true, recebimentoPreferido: true, percentualRepassePadrao: true },
  });
  if (!atual) return { erro: "Esta fornecedora não existe mais.", valores };
  manterProtegidos(valores, usuario.acesso, atual);
  const lido = lerFormularioFornecedora(valores, atual.documento, (await lerLoja()).repassePadrao);
  if (!lido.ok) return { erro: lido.erro, valores };

  const ok = await atualizarFornecedora(id, { ...lido.dados, ativa: valores.ativa === "sim" }, autorDe(usuario));
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
  const { nome: nomeLoja } = await lerLoja();
  const texto = r.tipo === "convite" ? mensagemDoConvite(f.nome, link, nomeLoja) : mensagemDoLink(f.nome, link, false, nomeLoja);
  refresh();
  return { link, tipo: r.tipo, whatsapp: tel ? `${linkWhatsappCliente(tel)}?text=${encodeURIComponent(texto)}` : undefined };
}
