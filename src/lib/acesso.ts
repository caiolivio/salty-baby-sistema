import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { podeAcessar, podeAlterar, podeVer, temExtra, type Area, type Extra, type Nivel, type Pagina } from "./permissoes";
import { buscarUsuarioAtivo, type UsuarioLogado } from "./usuarios";

/** Quem está usando o sistema agora (lido uma vez por requisição). */
export const usuarioAtual = cache(async (): Promise<UsuarioLogado | null> => {
  const sessao = await auth();
  const id = sessao?.user?.id;
  return id ? buscarUsuarioAtivo(id) : null;
});

/**
 * Use no início de toda página, layout e ação do servidor protegidos. Sem login,
 * leva para /entrar; logado sem permissão, leva para /sem-acesso.
 */
export async function exigirAcesso(area: Area, voltarPara?: string): Promise<UsuarioLogado> {
  const usuario = await usuarioAtual();
  if (!usuario) {
    redirect(voltarPara ? `/entrar?voltar=${encodeURIComponent(voltarPara)}` : "/entrar");
  }
  if (!podeAcessar(usuario.perfis, area)) redirect("/sem-acesso");
  return usuario;
}

/**
 * Páginas do painel que o suporte só usa se a administradora liberou (Painel >
 * Equipe). "ver" basta para abrir; ações que mudam dados pedem "alterar".
 */
export async function exigirPagina(pagina: Pagina, nivel: Nivel = "ver", voltarPara?: string): Promise<UsuarioLogado> {
  const usuario = await exigirAcesso("painel", voltarPara);
  const pode = nivel === "alterar" ? podeAlterar(usuario.acesso, pagina) : podeVer(usuario.acesso, pagina);
  if (!pode) redirect("/sem-acesso");
  return usuario;
}

/** Ações delicadas (excluir peça, confirmar pagamento, backup...) liberadas uma a uma. */
export async function exigirExtra(extra: Extra, voltarPara?: string): Promise<UsuarioLogado> {
  const usuario = await exigirAcesso("painel", voltarPara);
  if (!temExtra(usuario.acesso, extra)) redirect("/sem-acesso");
  return usuario;
}
