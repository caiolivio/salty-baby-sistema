"use server";

import { redirect } from "next/navigation";
import { conferirEnvioHumano, novoDesafio, type Desafio } from "@/lib/desafio/servidor";
import { LIMITE_PECAS_INSCRICAO, lerInscricao } from "@/lib/fornecedoras/candidatura";
import { registrarInscricao } from "@/lib/fornecedoras/candidaturas";

export type EstadoInscricao = { erro: string; valores: Record<string, string>; desafio: Desafio } | undefined;

// Formulário público do passo 1. Protegido pela imagem contra robôs.
export async function enviarInscricao(_estado: EstadoInscricao, dados: FormData): Promise<EstadoInscricao> {
  const valores = Object.fromEntries(
    [...dados.entries()].filter((par): par is [string, string] => typeof par[1] === "string"),
  );
  const pecas = Array.from({ length: LIMITE_PECAS_INSCRICAO + 1 }, (_, i) => {
    const foto = dados.get(`foto_${i}`);
    return {
      descricao: valores[`descricao_${i}`] ?? "",
      foto: foto instanceof File && foto.size > 0 ? foto : null,
    };
  });
  const lido = lerInscricao(
    valores,
    pecas.map((p) => ({ descricao: p.descricao, temFoto: Boolean(p.foto) })),
  );
  const devolver = async (erro: string) => ({ erro, valores, desafio: await novoDesafio() });
  if (!lido.ok) return devolver(lido.erro);
  const robo = await conferirEnvioHumano(dados);
  if (robo) return devolver(robo);

  const fotos = await Promise.all(
    pecas.filter((p) => p.descricao.trim() || p.foto).map(async (p) => Buffer.from(await p.foto!.arrayBuffer())),
  );
  try {
    await registrarInscricao(lido.dados, fotos);
  } catch (erro) {
    console.error("Falha ao gravar a inscrição de fornecedora:", erro);
    return devolver("Uma das fotos não abriu. Tire ou escolha a foto de novo e envie.");
  }
  redirect("/seja-fornecedora/enviada");
}
