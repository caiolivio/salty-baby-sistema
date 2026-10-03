import "server-only";
import { usuarioAtual } from "@/lib/acesso";
import { favoritosDoUsuario } from "@/lib/clientes/contas";
import { podeAcessar } from "@/lib/permissoes";

/**
 * Quem está vendo a loja: visitante, cliente ou fornecedora logada, ou alguém
 * do painel. A estrela de favorito aparece para visitantes (que são levados a
 * entrar), clientes e fornecedoras (que também compram), com as favoritas já marcadas.
 */
export async function quemVeALoja(pecaIds?: string[]) {
  const usuario = await usuarioAtual();
  const cliente = Boolean(usuario && podeAcessar(usuario.perfis, "area-cliente"));
  const fornecedora = Boolean(usuario && podeAcessar(usuario.perfis, "area-fornecedora"));
  return {
    usuario,
    cliente,
    estrela: !usuario || cliente || fornecedora,
    favoritas: cliente || fornecedora ? await favoritosDoUsuario(usuario!.id, pecaIds) : new Set<string>(),
  };
}
