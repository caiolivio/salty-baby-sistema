import "server-only";
import { usuarioAtual } from "@/lib/acesso";
import { favoritosDoUsuario } from "@/lib/clientes/contas";
import { podeAcessar } from "@/lib/permissoes";

/**
 * Quem está vendo a loja: visitante, cliente logada ou alguém do painel. A
 * estrela de favorito aparece para visitantes (que são levados a entrar) e
 * clientes, com as favoritas dela já marcadas.
 */
export async function quemVeALoja(pecaIds?: string[]) {
  const usuario = await usuarioAtual();
  const cliente = Boolean(usuario && podeAcessar(usuario.perfis, "area-cliente"));
  return {
    usuario,
    cliente,
    estrela: !usuario || cliente,
    favoritas: cliente ? await favoritosDoUsuario(usuario!.id, pecaIds) : new Set<string>(),
  };
}
