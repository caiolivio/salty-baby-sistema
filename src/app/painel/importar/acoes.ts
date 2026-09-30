"use server";

import { revalidatePath } from "next/cache";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { apagarFotosDePecas } from "@/lib/fotos";
import { apagarDadosImportados, gravarImportacao, jaExistemDados, podeApagarImportacao } from "@/lib/importacao/gravar";
import { prepararImportacao, type ArquivosNotion } from "@/lib/importacao/notion";
import { resumirPlano, type ResumoImportacao } from "@/lib/importacao/resumo";

export type FotoParaEnviar = { codigo: string; arquivo: string };
type Resultado<T> = ({ ok: true } & T) | { ok: false; erro: string };

const LIMITE = 5 * 1024 * 1024;

function validar(arquivos: ArquivosNotion): ArquivosNotion {
  for (const nome of ["produtos", "fornecedoras", "clientes", "vendas"] as const) {
    const texto = arquivos?.[nome];
    if (typeof texto !== "string" || texto.length === 0 || texto.length > LIMITE) {
      throw new Error(`Não encontrei a base de ${nome} no arquivo do Notion.`);
    }
  }
  return arquivos;
}

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro inesperado.";
}

export async function analisarNotion(arquivos: ArquivosNotion): Promise<Resultado<{ resumo: ResumoImportacao }>> {
  await exigirAcesso("painel-administracao");
  try {
    return { ok: true, resumo: resumirPlano(prepararImportacao(validar(arquivos))) };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function importarNotion(arquivos: ArquivosNotion): Promise<Resultado<{ fotos: FotoParaEnviar[] }>> {
  await exigirAcesso("painel-administracao");
  try {
    if (await jaExistemDados()) return { ok: false, erro: "A importação já foi feita." };
    const plano = prepararImportacao(validar(arquivos));
    await gravarImportacao(plano);
    // Sem revalidatePath aqui: recarregar a página agora trocaria a tela no meio do envio das fotos.
    return { ok: true, fotos: plano.pecas.flatMap((p) => (p.foto ? [{ codigo: p.codigo, arquivo: p.foto }] : [])) };
  } catch (erro) {
    console.error("Falha na importação do Notion:", erro);
    return { ok: false, erro: mensagem(erro) };
  }
}

/** Fotos que ainda faltam (para retomar o envio se a página foi fechada no meio). */
export async function fotosPendentes(arquivos: ArquivosNotion): Promise<Resultado<{ fotos: FotoParaEnviar[] }>> {
  await exigirAcesso("painel-administracao");
  try {
    const plano = prepararImportacao(validar(arquivos));
    const comFoto = new Set(
      (await prisma.peca.findMany({ where: { fotos: { some: {} } }, select: { codigo: true } })).map((p) => p.codigo),
    );
    return {
      ok: true,
      fotos: plano.pecas.flatMap((p) => (p.foto && !comFoto.has(p.codigo) ? [{ codigo: p.codigo, arquivo: p.foto }] : [])),
    };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function apagarImportacao(): Promise<void> {
  await exigirAcesso("painel-administracao");
  if (!podeApagarImportacao()) throw new Error("Apagar a importação não é permitido neste site.");
  await apagarDadosImportados();
  await apagarFotosDePecas();
  revalidatePath("/painel", "layout");
}
