"use server";

import { revalidatePath } from "next/cache";
import { exigirAcesso } from "@/lib/acesso";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerMes, mesFechado } from "@/lib/relatorios/regras";
import { marcarRelatorioEnviado } from "@/lib/relatorios/servidor";

/** Chamada ao tocar em "Enviar no WhatsApp": guarda que o relatório do mês foi enviado. */
export async function marcarEnviado(fornecedoraId: string, texto: string) {
  const usuario = await exigirAcesso("painel-administracao", "/painel/relatorios");
  const mes = lerMes(texto);
  if (!mes || !mesFechado(mes, hojeEmSaoPaulo()) || typeof fornecedoraId !== "string" || !fornecedoraId) return;
  await marcarRelatorioEnviado(fornecedoraId, mes, usuario.nome);
  revalidatePath("/painel/relatorios");
}
