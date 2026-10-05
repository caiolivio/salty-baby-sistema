"use server";

import { revalidatePath } from "next/cache";
import { exigirAcesso } from "@/lib/acesso";
import { autorDe } from "@/lib/historico/regras";
import { ehChavePagina, lerFormularioPagina, paginaEditavel } from "@/lib/paginas/regras";
import { salvarPagina } from "@/lib/paginas/servidor";

export type EstadoPagina = { erro?: string; aviso?: string; valores?: Record<string, string> } | undefined;

export async function salvar(_estado: EstadoPagina, dados: FormData): Promise<EstadoPagina> {
  const usuario = await exigirAcesso("painel-administracao");
  const chave = String(dados.get("chave") ?? "");
  if (!ehChavePagina(chave)) return { erro: "Página não encontrada." };
  const valores = Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const lido = lerFormularioPagina(valores, chave);
  if (!lido.ok) return { erro: lido.erro, valores };
  const { versao, reaceites } = await salvarPagina(chave, lido.dados, autorDe(usuario));
  // O texto aparece no rodapé de todas as páginas do site.
  revalidatePath("/", "layout");
  const pagina = paginaEditavel(chave);
  return {
    aviso: [
      `${pagina.nome} salvo (versão ${versao}).`,
      lido.dados.publicada ? "" : "A página está fora do ar.",
      lido.dados.exigirAceite
        ? reaceites === 1
          ? "1 fornecedora vai aceitar o acordo de novo no próximo acesso."
          : `${reaceites} fornecedoras vão aceitar o acordo de novo no próximo acesso.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
