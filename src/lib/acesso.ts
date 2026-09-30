import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { podeAcessar, type Area } from "./permissoes";
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
