"use server";

import { revalidatePath } from "next/cache";
import { exigirAcesso } from "@/lib/acesso";
import { autorDe } from "@/lib/historico/regras";
import { lerFormularioLoja } from "@/lib/loja/regras";
import { lerLoja, prefixoEmUso, salvarLoja } from "@/lib/loja/servidor";

export type EstadoLoja = { erro?: string; aviso?: string; valores?: Record<string, string> } | undefined;

const TAMANHO_MAXIMO = 8 * 1024 * 1024;

async function imagem(dados: FormData, campo: "logo" | "icone"): Promise<Buffer | "padrao" | undefined | string> {
  if (dados.get(`${campo}Padrao`) === "sim") return "padrao";
  const arquivo = dados.get(campo);
  if (!(arquivo instanceof File) || arquivo.size === 0) return undefined;
  if (arquivo.size > TAMANHO_MAXIMO) return `A imagem do ${campo === "logo" ? "logo" : "ícone"} é grande demais (até 8 MB).`;
  return Buffer.from(await arquivo.arrayBuffer());
}

export async function salvarConfiguracoes(_estado: EstadoLoja, dados: FormData): Promise<EstadoLoja> {
  const usuario = await exigirAcesso("painel-administracao");
  const valores = Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const atual = await lerLoja();
  const fixo = (await prefixoEmUso(atual.prefixoLoja)) ? atual.prefixoLoja : undefined;
  const lido = lerFormularioLoja(valores, fixo);
  if (!lido.ok) return { erro: lido.erro, valores };
  if (!fixo && lido.dados.prefixoLoja !== atual.prefixoLoja && (await prefixoEmUso(lido.dados.prefixoLoja))) {
    return { erro: `Já existem peças com o prefixo ${lido.dados.prefixoLoja}. Escolha outro.`, valores };
  }

  const [logo, icone] = [await imagem(dados, "logo"), await imagem(dados, "icone")];
  for (const i of [logo, icone]) if (typeof i === "string" && i !== "padrao") return { erro: i, valores };
  try {
    await salvarLoja(lido.dados, { logo: logo as Buffer | "padrao" | undefined, icone: icone as Buffer | "padrao" | undefined }, autorDe(usuario));
  } catch (erro) {
    console.error("Falha ao salvar as configurações:", erro);
    return { erro: "Uma das imagens não abriu. Use um arquivo PNG ou JPG.", valores };
  }
  // Nome, cores e logo aparecem em todas as páginas.
  revalidatePath("/", "layout");
  return { aviso: "Configurações salvas. O site já mostra as mudanças." };
}
