"use server";

import { refresh } from "next/cache";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { lerNovaSenha } from "@/lib/clientes/conta";
import { trocarSenha } from "@/lib/clientes/contas";
import { ERRO_EMAIL_EM_USO, emailDeEntradaEmUso } from "@/lib/contas/pela-loja";
import { lerFormularioSuporte } from "@/lib/equipe/regras";
import { registrar } from "@/lib/historico/gravar";
import { autorDe, type Mudanca } from "@/lib/historico/regras";

// "Meus dados" de quem usa o painel (administradora ou suporte): cada pessoa
// muda o próprio nome, e-mail de entrada, WhatsApp e senha.

export type EstadoMeusDados = { erro?: string; ok?: string; valores?: Record<string, string> } | undefined;

export async function salvarMeusDados(_estado: EstadoMeusDados, dados: FormData): Promise<EstadoMeusDados> {
  const usuario = await exigirAcesso("painel", "/painel/meus-dados");
  const valores = Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const lido = lerFormularioSuporte(valores);
  if (!lido.ok) return { erro: lido.erro, valores };
  if (await emailDeEntradaEmUso(lido.dados.email, usuario.id)) return { erro: ERRO_EMAIL_EM_USO, valores };
  await prisma.$transaction(async (tx) => {
    const antes = await tx.usuario.findUniqueOrThrow({ where: { id: usuario.id }, select: { nome: true, email: true, whatsapp: true } });
    const mudancas: Mudanca[] = [];
    if (antes.nome !== lido.dados.nome) mudancas.push({ campo: "Nome", antes: antes.nome, depois: lido.dados.nome, restrito: false });
    if (antes.email !== lido.dados.email) {
      mudancas.push({ campo: "E-mail de entrada", antes: antes.email, depois: lido.dados.email, restrito: false });
    }
    if (antes.whatsapp !== lido.dados.whatsapp) {
      mudancas.push({ campo: "WhatsApp", antes: antes.whatsapp, depois: lido.dados.whatsapp, restrito: false });
    }
    await tx.usuario.update({ where: { id: usuario.id }, data: lido.dados });
    await registrar(
      tx,
      { tabela: "equipe", id: usuario.id, rotulo: `${lido.dados.nome} (${lido.dados.email})` },
      mudancas,
      autorDe(usuario),
      "A pessoa mudou os próprios dados",
    );
  });
  refresh();
  return { ok: "Dados salvos." };
}

export async function mudarMinhaSenha(_estado: EstadoMeusDados, dados: FormData): Promise<EstadoMeusDados> {
  const usuario = await exigirAcesso("painel", "/painel/meus-dados");
  const lido = lerNovaSenha(Object.fromEntries(dados.entries()));
  if (!lido.ok) return { erro: lido.erro };
  const ok = await trocarSenha(usuario.id, String(dados.get("atual") ?? ""), lido.dados);
  if (!ok) return { erro: "A senha atual não confere." };
  return { ok: "Senha trocada." };
}
