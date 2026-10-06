"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import {
  buscarSuporte,
  criarAdministradora,
  criarSuporte,
  linkDeSenhaDoSuporte,
  salvarAdministradora,
  salvarSuporte,
  tirarAdministradora,
  tirarDaEquipe,
} from "@/lib/equipe/gravar";
import { lerFormularioSuporte, mensagemDoSuporte } from "@/lib/equipe/regras";
import { ERRO_EMAIL_EM_USO, emailDeEntradaEmUso } from "@/lib/contas/pela-loja";
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
  const lido = lerFormularioSuporte(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  if (await emailDeEntradaEmUso(lido.dados.email, id)) return { erro: ERRO_EMAIL_EM_USO, valores };
  const ok = await salvarSuporte(id, lido.dados, lerPermissoes(valores), autorDe(usuario));
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

export async function novaAdministradora(_estado: EstadoSuporte, dados: FormData): Promise<EstadoSuporte> {
  const usuario = await exigirAcesso("painel-administracao", "/painel/equipe/nova-administradora");
  const valores = valoresDigitados(dados);
  const lido = lerFormularioSuporte(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  if (valores.confirmo !== "sim") return { erro: "Confirme que a pessoa terá todos os poderes do painel.", valores };
  const r = await criarAdministradora(lido.dados, autorDe(usuario));
  if (!r.ok) return { erro: "Esta pessoa já é administradora.", valores };
  const link = r.codigo ? await linkParaEnviar(r.codigo, lido.dados.nome, lido.dados.whatsapp, true) : {};
  return { criado: { id: r.id, nome: lido.dados.nome, ...link } };
}

export async function salvarDadosDaAdministradora(_estado: EstadoSuporte, dados: FormData): Promise<EstadoSuporte> {
  const valores = valoresDigitados(dados);
  const id = valores.id ?? "";
  const usuario = await exigirAcesso("painel-administracao", `/painel/equipe/${id}`);
  const atual = await buscarSuporte(id);
  if (!atual?.administradora) return { erro: "Esta pessoa não é mais administradora.", valores };
  const lido = lerFormularioSuporte(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  if (await emailDeEntradaEmUso(lido.dados.email, id)) return { erro: ERRO_EMAIL_EM_USO, valores };
  const ok = await salvarAdministradora(id, lido.dados, autorDe(usuario));
  if (!ok) return { erro: "Esta pessoa não é mais administradora.", valores };
  redirect(`/painel/equipe/${id}?salvo=1`);
}

/** O suporte passa a ser administradora, com todos os poderes. */
export async function tornarAdministradora(dados: FormData) {
  const id = String(dados.get("id") ?? "");
  const usuario = await exigirAcesso("painel-administracao", `/painel/equipe/${id}`);
  const s = await buscarSuporte(id);
  if (!s || s.administradora) redirect(`/painel/equipe/${id}`);
  await criarAdministradora({ nome: s.nome, email: s.email, whatsapp: s.whatsapp }, autorDe(usuario));
  redirect(`/painel/equipe/${id}?administradora=1`);
}

export async function tirarAdministradoraDaEquipe(_estado: EstadoLink, dados: FormData): Promise<EstadoLink> {
  const id = String(dados.get("id") ?? "");
  const usuario = await exigirAcesso("painel-administracao", `/painel/equipe/${id}`);
  const r = await tirarAdministradora(id, autorDe(usuario));
  if (!r.ok) return { erro: r.erro };
  redirect("/painel/equipe?saiu=1");
}
