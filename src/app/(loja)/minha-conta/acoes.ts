"use server";

import { refresh } from "next/cache";
import { signOut } from "@/auth";
import { exigirAcesso } from "@/lib/acesso";
import { lerNovaSenha, lerPerfil } from "@/lib/clientes/conta";
import { alternarFavorito, atualizarPerfil, fichaDaCliente, trocarSenha } from "@/lib/clientes/contas";
import { enderecoDeVoltaSeguro } from "@/lib/permissoes";

// Ações da área do cliente. Cada uma confere o login e só mexe na conta e na
// ficha de quem está logado.

/** Estrela da peça. Sem login, leva para entrar (ou criar conta) e depois volta para a peça. */
export async function favoritar(dados: FormData) {
  const voltar = enderecoDeVoltaSeguro(dados.get("voltar")) ?? "/";
  const usuario = await exigirAcesso("area-cliente", voltar);
  const ficha = await fichaDaCliente(usuario);
  await alternarFavorito(ficha.id, String(dados.get("pecaId") ?? ""));
  refresh();
}

export type EstadoPerfil = { erro?: string; ok?: string } | undefined;

export async function salvarPerfil(_estado: EstadoPerfil, dados: FormData): Promise<EstadoPerfil> {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/perfil");
  const ficha = await fichaDaCliente(usuario);
  const lido = lerPerfil(Object.fromEntries(dados.entries()));
  if (!lido.ok) return { erro: lido.erro };
  const r = await atualizarPerfil(usuario.id, ficha.id, lido.dados);
  if (!r.ok) {
    return {
      erro:
        r.motivo === "email-em-uso"
          ? "Este e-mail já é usado em outra conta."
          : "Este WhatsApp já está em outro cadastro. Fale com a loja para juntar os dois.",
    };
  }
  refresh();
  return { ok: "Dados salvos." };
}

export async function mudarSenha(_estado: EstadoPerfil, dados: FormData): Promise<EstadoPerfil> {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/perfil");
  const lido = lerNovaSenha(Object.fromEntries(dados.entries()));
  if (!lido.ok) return { erro: lido.erro };
  const certo = await trocarSenha(usuario.id, String(dados.get("atual") ?? ""), lido.dados);
  return certo ? { ok: "Senha trocada." } : { erro: "A senha atual não confere." };
}

export async function sair() {
  await signOut({ redirectTo: "/" });
}
