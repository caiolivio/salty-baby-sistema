"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { lerDespesa, lerTaxas, lerValorEmReais } from "@/lib/financeiro/regras";
import { ajustarTaxa, aplicarTaxasNoMes, criarDespesa, excluirDespesa, salvarTaxas } from "@/lib/financeiro/servidor";
import { autorDe } from "@/lib/historico/regras";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerMes } from "@/lib/relatorios/regras";

// Financeiro: só a administradora.

export type EstadoDespesa = { erro?: string; valores?: Record<string, string>; ok?: boolean } | undefined;

const texto = (dados: FormData, campo: string) => {
  const v = dados.get(campo);
  return typeof v === "string" ? v : "";
};

export async function novaDespesa(_anterior: EstadoDespesa, dados: FormData): Promise<EstadoDespesa> {
  const usuario = await exigirAcesso("painel-administracao", "/painel/financeiro/despesas");
  const valores = {
    data: texto(dados, "data"),
    descricao: texto(dados, "descricao"),
    categoria: texto(dados, "categoria"),
    valor: texto(dados, "valor"),
  };
  const lido = lerDespesa(valores, hojeEmSaoPaulo());
  if (!lido.ok) return { erro: lido.erro, valores };
  await criarDespesa(lido.dados, autorDe(usuario));
  revalidatePath("/painel/financeiro");
  return { ok: true, valores: { data: valores.data, categoria: valores.categoria } };
}

export async function apagarDespesa(dados: FormData) {
  await exigirAcesso("painel-administracao", "/painel/financeiro/despesas");
  await excluirDespesa(texto(dados, "id"));
  revalidatePath("/painel/financeiro");
  const mes = lerMes(texto(dados, "mes"));
  redirect(`/painel/financeiro/despesas${mes ? `?mes=${mes}` : ""}`);
}

export async function guardarTaxas(dados: FormData) {
  const usuario = await exigirAcesso("painel-administracao", "/painel/financeiro/taxas");
  const lido = lerTaxas({ pix: texto(dados, "pix"), cartao: texto(dados, "cartao") });
  if (!lido.ok) redirect(`/painel/financeiro/taxas?erro=${encodeURIComponent(lido.erro)}`);
  await salvarTaxas(lido.taxas, usuario.nome);
  revalidatePath("/painel/financeiro");
  redirect("/painel/financeiro/taxas?salvo=1");
}

export async function aplicarTaxas(dados: FormData) {
  await exigirAcesso("painel-administracao", "/painel/financeiro/taxas");
  const mes = lerMes(texto(dados, "mes")) ?? hojeEmSaoPaulo().slice(0, 7);
  const mudaram = await aplicarTaxasNoMes(mes);
  revalidatePath("/painel/financeiro");
  redirect(`/painel/financeiro/taxas?mes=${mes}&aplicadas=${mudaram}`);
}

export async function corrigirTaxa(dados: FormData) {
  await exigirAcesso("painel-administracao", "/painel/financeiro/taxas");
  const mes = lerMes(texto(dados, "mes")) ?? hojeEmSaoPaulo().slice(0, 7);
  const valor = texto(dados, "taxa").trim() === "" ? 0 : lerValorEmReais(texto(dados, "taxa"));
  if (valor === undefined)
    redirect(`/painel/financeiro/taxas?mes=${mes}&erro=${encodeURIComponent("Escreva a taxa em reais, por exemplo 2,35.")}`);
  await ajustarTaxa(texto(dados, "id"), valor);
  revalidatePath("/painel/financeiro");
  redirect(`/painel/financeiro/taxas?mes=${mes}&ajustada=1`);
}
