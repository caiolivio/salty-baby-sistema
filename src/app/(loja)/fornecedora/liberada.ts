import "server-only";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { situacaoNaArea } from "@/lib/fornecedoras/candidaturas";
import { etapaDaFornecedora } from "@/lib/fornecedoras/conta";

/**
 * Para as páginas e ações da área que só abrem com o cadastro concluído
 * (dados, acordo e parabéns). Quem não terminou volta para /fornecedora,
 * onde vê o passo que falta.
 */
export async function exigirFornecedoraLiberada(voltar: string) {
  const usuario = await exigirAcesso("area-fornecedora", voltar);
  const situacao = await situacaoNaArea(usuario.id);
  if (situacao.tipo !== "fornecedora" || etapaDaFornecedora(situacao.fornecedora) !== "liberada") redirect("/fornecedora");
  return { usuario, fornecedora: situacao.fornecedora };
}
