"use server";

import { refresh } from "next/cache";
import { exigirPagina } from "@/lib/acesso";
import { lerValorEmReais } from "@/lib/financeiro/regras";
import { autorDe } from "@/lib/historico/regras";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { FECHAMENTOS, lerPrazo, type Fechamento } from "@/lib/sacolinhas/regras";
import { fecharSacolinha, marcarAvisoEnviado, mudarPrazo, pedirEnvio, voltarParaAberta } from "@/lib/sacolinhas/servidor";

// Sacolinhas no painel: quem pode alterar a página "Sacolinhas" fecha, muda o
// prazo e marca os avisos. Cada mudança entra no histórico da cliente.

export type EstadoSacolinha = { erro?: string; ok?: string } | undefined;

const id = (dados: FormData) => String(dados.get("id") ?? "");

export async function fechar(_: EstadoSacolinha, dados: FormData): Promise<EstadoSacolinha> {
  const usuario = await exigirPagina("sacolinhas", "alterar", "/painel/sacolinhas");
  const como = String(dados.get("como") ?? "") as Fechamento;
  if (!FECHAMENTOS.includes(como)) return { erro: "Escolha como a sacolinha foi fechada." };
  const textoFrete = String(dados.get("frete") ?? "").trim();
  const frete = textoFrete ? lerValorEmReais(textoFrete) : null;
  if (frete === undefined) return { erro: "Escreva o frete em reais, por exemplo 18,50." };
  const observacao = String(dados.get("observacao") ?? "").trim().slice(0, 255) || null;
  const r = await fecharSacolinha(id(dados), como, autorDe(usuario), hojeEmSaoPaulo(), {
    ...(como === "enviada" ? { freteCentavos: frete } : {}),
    observacao,
  });
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: { enviada: "Sacolinha marcada como enviada.", retirada: "Sacolinha marcada como retirada.", doada: "Peças marcadas como doadas." }[como] };
}

export async function doar(dados: FormData): Promise<void> {
  const usuario = await exigirPagina("sacolinhas", "alterar", "/painel/sacolinhas");
  await fecharSacolinha(id(dados), "doada", autorDe(usuario), hojeEmSaoPaulo());
  refresh();
}

export async function trocarPrazo(_: EstadoSacolinha, dados: FormData): Promise<EstadoSacolinha> {
  const usuario = await exigirPagina("sacolinhas", "alterar", "/painel/sacolinhas");
  const lido = lerPrazo(dados.get("prazo"), hojeEmSaoPaulo());
  if (!lido.ok) return { erro: lido.erro };
  const r = await mudarPrazo(id(dados), lido.prazo, autorDe(usuario));
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: "Prazo mudado." };
}

export async function registrarPedidoDeEnvio(dados: FormData): Promise<void> {
  const usuario = await exigirPagina("sacolinhas", "alterar", "/painel/sacolinhas");
  await pedirEnvio(id(dados), autorDe(usuario));
  refresh();
}

export async function desfazerPedidoDeEnvio(dados: FormData): Promise<void> {
  const usuario = await exigirPagina("sacolinhas", "alterar", "/painel/sacolinhas");
  await voltarParaAberta(id(dados), autorDe(usuario));
  refresh();
}

/** Tocou em "Enviar no WhatsApp" ou "Copiar texto" do aviso semanal. */
export async function avisoEnviado(sacolinhaId: string): Promise<void> {
  await exigirPagina("sacolinhas", "alterar", "/painel/sacolinhas");
  await marcarAvisoEnviado(sacolinhaId);
  refresh();
}
