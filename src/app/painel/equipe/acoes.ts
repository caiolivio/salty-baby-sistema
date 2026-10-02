"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { buscarSuporte, criarSuporte, linkDeSenhaDoSuporte, salvarSuporte, tirarDaEquipe } from "@/lib/equipe/gravar";
import { lerFormularioSuporte, mensagemDoSuporte } from "@/lib/equipe/regras";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { autorDe } from "@/lib/historico/regras";
import { lerLoja } from "@/lib/loja/servidor";
import { linkWhatsappCliente } from "@/lib/pedidos/regras";
import { lerPermissoes } from "@/lib/permissoes";

export type EstadoSuporte =
  | { erro?: string; valores?: Record<string, string>; criado?: { id: string; nome: string; link?: string; whatsapp?: string } }
  | undefined;
export type EstadoLink = { erro?: string; link?: string; whatsapp?: string } | undefined;

const valoresDigitados = (dados: FormData) =>
  Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

async function linkParaEnviar(codigo: string, nome: string, whatsapp: string | null, novaConta: boolean) {
  const origem = origemDaRequisicao(await headers()).replace(/\/+$/, "");
  const link = `${origem}/criar-senha/${codigo}`;
  const texto = mensagemDoSuporte(nome, link, (await lerLoja()).nome, novaConta);
  return { link, whatsapp: whatsapp ? `${linkWhatsappCliente(whatsapp)}?text=${encodeURIComponent(texto)}` : undefined };
}

export async function novoSuporte(_estado: EstadoSuporte, dados: FormData): Promise<EstadoSuporte> {
  const usuario = await exigirAcesso("painel-administracao", "/painel/equipe/novo");
  const valores = valoresDigitados(dados);
  const lido = lerFormularioSuporte(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  const permissoes = lerPermissoes(valores);
  if (!permissoes.some((p) => p.nivel !== "sim")) return { erro: "Escolha pelo menos uma página para o suporte usar.", valores };

  const r = await criarSuporte(lido.dados, permissoes, autorDe(usuario));
  if (!r.ok) return { erro: "Esta pessoa já faz parte da equipe. Abra o cadastro dela na lista.", valores };
  // O link aparece uma vez só, aqui (não vai para o endereço da página).
  const link = r.codigo ? await linkParaEnviar(r.codigo, lido.dados.nome, lido.dados.whatsapp, true) : {};
  return { criado: { id: r.id, nome: lido.dados.nome, ...link } };
}

export async function salvarAcessoDoSuporte(_estado: EstadoSuporte, dados: FormData): Promise<EstadoSuporte> {
  const valores = valoresDigitados(dados);
  const id = valores.id ?? "";
  const usuario = await exigirAcesso("painel-administracao", `/painel/equipe/${id}`);
  const atual = await buscarSuporte(id);
  if (!atual) return { erro: "Esta pessoa não está mais na equipe.", valores };
  // O e-mail é o login e não muda aqui.
  const lido = lerFormularioSuporte({ ...valores, email: atual.email });
  if (!lido.ok) return { erro: lido.erro, valores };
  const ok = await salvarSuporte(id, { nome: lido.dados.nome, whatsapp: lido.dados.whatsapp }, lerPermissoes(valores), autorDe(usuario));
  if (!ok) return { erro: "Esta pessoa não está mais na equipe.", valores };
  redirect(`/painel/equipe/${id}?salvo=1`);
}

export async function gerarLinkDoSuporte(_estado: EstadoLink, dados: FormData): Promise<EstadoLink> {
  const id = String(dados.get("id") ?? "");
  await exigirAcesso("painel-administracao", `/painel/equipe/${id}`);
  const suporte = await buscarSuporte(id);
  const codigo = suporte ? await linkDeSenhaDoSuporte(id) : null;
  if (!suporte || !codigo) return { erro: "Esta pessoa não está mais na equipe." };
  return linkParaEnviar(codigo, suporte.nome, suporte.whatsapp, false);
}

export async function tirarSuporte(dados: FormData) {
  const id = String(dados.get("id") ?? "");
  const usuario = await exigirAcesso("painel-administracao", `/painel/equipe/${id}`);
  await tirarDaEquipe(id, autorDe(usuario));
  redirect("/painel/equipe?saiu=1");
}
