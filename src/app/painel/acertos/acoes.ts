"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { AcertoMudou, desfazerAcerto, pendentesDaFornecedora, registrarAcerto } from "@/lib/acertos/gravar";
import { lerAcerto } from "@/lib/acertos/regras";
import { autorDe } from "@/lib/historico/regras";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";

export type EstadoPagar = { erro?: string; marcados?: string[]; data?: string; forma?: string; observacao?: string } | undefined;

/** "Registrar pagamento": marca as vendas escolhidas como pagas e abre o comprovante. */
export async function pagarRepasses(_anterior: EstadoPagar, dados: FormData): Promise<EstadoPagar> {
  const fornecedoraId = String(dados.get("fornecedoraId") ?? "");
  const usuario = await exigirAcesso("painel-administracao", `/painel/acertos/pagar/${fornecedoraId}`);
  const valores = {
    itens: dados.getAll("item"),
    data: dados.get("data"),
    forma: dados.get("forma"),
    observacao: dados.get("observacao"),
  };
  const devolver = {
    marcados: valores.itens.filter((v): v is string => typeof v === "string"),
    data: typeof valores.data === "string" ? valores.data : undefined,
    forma: typeof valores.forma === "string" ? valores.forma : undefined,
    observacao: typeof valores.observacao === "string" ? valores.observacao : undefined,
  };
  const pendentes = await pendentesDaFornecedora(fornecedoraId);
  const lido = lerAcerto(valores, pendentes, hojeEmSaoPaulo());
  if (!lido.ok) return { erro: lido.erro, ...devolver };
  let id: string;
  try {
    ({ id } = await registrarAcerto(fornecedoraId, lido.dados, autorDe(usuario)));
  } catch (e) {
    if (e instanceof AcertoMudou) return { erro: e.message, ...devolver };
    throw e;
  }
  revalidatePath("/painel/acertos");
  redirect(`/painel/acertos/${id}?pago=1`);
}

/** Desfaz um pagamento registrado por engano. */
export async function desfazer(dados: FormData): Promise<void> {
  const id = String(dados.get("id") ?? "");
  const usuario = await exigirAcesso("painel-administracao", `/painel/acertos/${id}`);
  await desfazerAcerto(id, autorDe(usuario));
  revalidatePath("/painel/acertos");
  redirect("/painel/acertos?desfeito=1");
}
