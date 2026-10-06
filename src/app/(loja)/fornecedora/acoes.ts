"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { exigirAcesso } from "@/lib/acesso";
import { lerNovaSenha } from "@/lib/clientes/conta";
import { trocarSenha } from "@/lib/clientes/contas";
import { pedirDevolucao } from "@/lib/fornecedoras/area";
import { lerDadosDaCandidata, lerProposta } from "@/lib/fornecedoras/candidatura";
import { ERRO_EMAIL_EM_USO, emailDeEntradaEmUso } from "@/lib/contas/pela-loja";
import { atualizarCandidatura, marcarBoasVindas, registrarProposta, situacaoNaArea, tirarProposta } from "@/lib/fornecedoras/candidaturas";
import { etapaDaFornecedora, lerDadosDaFornecedora } from "@/lib/fornecedoras/conta";
import { salvarDadosDaFornecedora } from "@/lib/fornecedoras/convites";
import { contratoParaAceite, registrarAceite, segredoDoAceite } from "@/lib/fornecedoras/aceite";
import { conferirAbertura, lerAceiteDoContrato, lerLidoEm } from "@/lib/fornecedoras/contrato";
import { enderecoDeQuemEnviou } from "@/lib/desafio/servidor";
import { headers } from "next/headers";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { exigirFornecedoraLiberada } from "./liberada";
import { autorDe } from "@/lib/historico/regras";

// Ações da área da fornecedora. Cada uma confere o login e só mexe nos dados
// de quem está logada.

/** De quem são as peças propostas por quem está logada (candidata ou fornecedora). */
async function donoDasPropostas() {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const situacao = await situacaoNaArea(usuario.id);
  if (situacao.tipo === "fornecedora") {
    const f = situacao.fornecedora;
    return f.ativa && etapaDaFornecedora(f) === "liberada" ? { fornecedoraId: f.id } : null;
  }
  if (situacao.tipo === "candidata" && ["aprovada", "acordo_aceito"].includes(situacao.candidatura.etapa)) {
    return { candidaturaId: situacao.candidatura.id };
  }
  return null;
}

export type EstadoProposta = { erro?: string; ok?: string; valores?: Record<string, string> } | undefined;

export async function enviarProposta(_estado: EstadoProposta, dados: FormData): Promise<EstadoProposta> {
  const dono = await donoDasPropostas();
  if (!dono) return { erro: "Sua área ainda não está liberada para enviar peças." };
  const valores = Object.fromEntries(
    [...dados.entries()].filter((par): par is [string, string] => typeof par[1] === "string"),
  );
  const foto = dados.get("foto");
  const temFoto = foto instanceof File && foto.size > 0;
  const lido = lerProposta(valores, temFoto);
  if (!lido.ok) return { erro: lido.erro, valores };
  try {
    await registrarProposta(dono, lido.dados, Buffer.from(await (foto as File).arrayBuffer()));
  } catch (erro) {
    console.error("Falha ao gravar a peça proposta:", erro);
    return { erro: "A foto não abriu. Tire ou escolha a foto de novo.", valores };
  }
  refresh();
  return { ok: `"${lido.dados.nome}" enviada para a loja avaliar.` };
}

export async function tirar(dados: FormData): Promise<void> {
  const dono = await donoDasPropostas();
  if (dono) await tirarProposta(String(dados.get("id") ?? ""), dono);
  refresh();
}

export type EstadoAceite = { erro?: string; valores?: Record<string, string> } | undefined;

/**
 * Aceite do contrato: passo 2 da inscrição, passo 2 do primeiro acesso das que
 * já eram parceiras, ou novo aceite quando o contrato muda. Só vale com o
 * contrato lido até o fim, aberto há menos de 24 horas e sem mudança no texto.
 */
export async function aceitar(_estado: EstadoAceite, dados: FormData): Promise<EstadoAceite> {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const valores = Object.fromEntries([...dados.entries()].filter((par): par is [string, string] => typeof par[1] === "string"));
  const situacao = await situacaoNaArea(usuario.id);
  const quem =
    situacao.tipo === "candidata" && situacao.candidatura.etapa === "aprovada"
      ? { tipo: "candidata" as const, candidaturaId: situacao.candidatura.id }
      : situacao.tipo === "fornecedora" && etapaDaFornecedora(situacao.fornecedora) === "acordo"
        ? { tipo: "fornecedora" as const, fornecedoraId: situacao.fornecedora.id }
        : null;
  if (!quem) redirect("/fornecedora");

  const lido = lerAceiteDoContrato(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  const contrato = await contratoParaAceite();
  const abertura = conferirAbertura(segredoDoAceite(), usuario.id, contrato.hash, valores.abertura ?? "");
  if (!abertura.ok) {
    // Mostra o contrato de agora, com uma abertura nova.
    refresh();
    return {
      erro:
        abertura.motivo === "mudou"
          ? "O contrato foi atualizado enquanto você lia. Leia a versão nova até o fim e aceite de novo."
          : "Esta página ficou aberta por muito tempo. Leia o contrato de novo até o fim e aceite.",
      valores: { ...valores, lido: "" },
    };
  }
  const cabecalhos = await headers();
  const ip = enderecoDeQuemEnviou(cabecalhos);
  const r = await registrarAceite(usuario.id, quem, lido.dados, contrato, {
    abertoEm: abertura.abertoEm,
    lidoAteOFimEm: lerLidoEm(valores.lido_em, abertura.abertoEm),
    ip: ip === "desconhecido" ? null : ip,
    navegador: cabecalhos.get("user-agent"),
  });
  if (!r.ok) return { erro: r.erro, valores };
  redirect("/fornecedora");
}

export async function concluirBoasVindas(): Promise<void> {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const situacao = await situacaoNaArea(usuario.id);
  if (situacao.tipo === "fornecedora" && etapaDaFornecedora(situacao.fornecedora) === "parabens") {
    await marcarBoasVindas(situacao.fornecedora.id);
  }
  redirect("/fornecedora");
}

export type EstadoDados = { erro?: string; ok?: string; valores?: Record<string, string> } | undefined;

/** Dados da fornecedora: passo 1 (quando falta algo obrigatório) e "Meus dados". */
export async function salvarDados(_estado: EstadoDados, dados: FormData): Promise<EstadoDados> {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const situacao = await situacaoNaArea(usuario.id);
  if (situacao.tipo !== "fornecedora") return { erro: "Sua área ainda não está pronta." };
  const valores = Object.fromEntries(
    [...dados.entries()].filter((par): par is [string, string] => typeof par[1] === "string"),
  );
  const lido = lerDadosDaFornecedora(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  const r = await salvarDadosDaFornecedora(situacao.fornecedora.id, usuario.id, lido.dados);
  if (!r.ok) return { erro: "Este e-mail já é usado por outra conta no site.", valores };
  if (etapaDaFornecedora(situacao.fornecedora) === "dados") redirect("/fornecedora");
  refresh();
  return { ok: "Dados salvos." };
}

/** Passo 2: a candidata corrige os dados da inscrição (e o e-mail com que entra). */
export async function salvarDadosDaInscricao(_estado: EstadoDados, dados: FormData): Promise<EstadoDados> {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const situacao = await situacaoNaArea(usuario.id);
  if (situacao.tipo !== "candidata") return { erro: "Seus dados agora ficam em Meus dados." };
  const valores = Object.fromEntries(
    [...dados.entries()].filter((par): par is [string, string] => typeof par[1] === "string"),
  );
  const lido = lerDadosDaCandidata(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  if (await emailDeEntradaEmUso(lido.dados.email, usuario.id)) return { erro: ERRO_EMAIL_EM_USO, valores };
  if (!(await atualizarCandidatura(situacao.candidatura.id, lido.dados, usuario.id))) {
    return { erro: "Seus dados agora ficam em Meus dados.", valores };
  }
  refresh();
  return { ok: "Dados salvos." };
}

export type EstadoSenha = { erro?: string; ok?: string } | undefined;

export async function mudarSenha(_estado: EstadoSenha, dados: FormData): Promise<EstadoSenha> {
  const { usuario } = await exigirFornecedoraLiberada("/fornecedora/dados");
  const nova = lerNovaSenha({ senha: dados.get("senha"), confirmacao: dados.get("confirmacao") });
  if (!nova.ok) return { erro: nova.erro };
  const ok = await trocarSenha(usuario.id, String(dados.get("atual") ?? ""), nova.dados);
  return ok ? { ok: "Senha trocada." } : { erro: "A senha atual não confere." };
}

/** Pede de volta as peças marcadas (só as que já passaram dos 6 meses). */
export async function pedirDevolucoes(dados: FormData): Promise<void> {
  const { fornecedora, usuario } = await exigirFornecedoraLiberada("/fornecedora/pecas");
  const ids = dados.getAll("peca").map(String);
  const autor = autorDe({ id: usuario.id, nome: `${usuario.nome} (fornecedora ${fornecedora.codigo})` });
  const pedidas = ids.length > 0 ? await pedirDevolucao(fornecedora.id, ids, hojeEmSaoPaulo(), autor) : 0;
  redirect(`/fornecedora/pecas?pedidas=${pedidas}`);
}

export async function sair(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
