"use server";

import { refresh } from "next/cache";
import { signOut } from "@/auth";
import { redirect } from "next/navigation";
import { exigirAcesso, usuarioAtual } from "@/lib/acesso";
import { lerNovaSenha, lerPerfil } from "@/lib/clientes/conta";
import { alternarFavorito, atualizarPerfil, fichaDaCliente, tornarTambemCliente, trocarSenha } from "@/lib/clientes/contas";
import { enderecoDeVoltaSeguro, podeAcessar } from "@/lib/permissoes";
import { autorDe } from "@/lib/historico/regras";
import { pedirEnvio } from "@/lib/sacolinhas/servidor";
import { lerAlerta } from "@/lib/alertas/regras";
import { apagarAlerta, criarAlerta } from "@/lib/alertas/servidor";

// Ações da área do cliente. Cada uma confere o login e só mexe na conta e na
// ficha de quem está logado.

/** Estrela da peça. Sem login, leva para entrar (ou criar conta) e depois volta para a peça. */
export async function favoritar(dados: FormData) {
  const voltar = enderecoDeVoltaSeguro(dados.get("voltar")) ?? "/";
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/entrar?voltar=${encodeURIComponent(voltar)}`);
  // A fornecedora também favorita: ganha o perfil de cliente na primeira estrela.
  if (!podeAcessar(usuario.perfis, "area-cliente")) {
    if (!podeAcessar(usuario.perfis, "area-fornecedora")) redirect("/sem-acesso");
    await tornarTambemCliente(usuario.id);
  }
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

/** "Pedir envio" da sacolinha: só a dona da sacolinha. Depois, a página mostra o WhatsApp para combinar o frete. */
export async function pedirEnvioDaSacolinha(dados: FormData) {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/sacolinha");
  const ficha = await fichaDaCliente(usuario);
  const r = await pedirEnvio(String(dados.get("id") ?? ""), autorDe(usuario), ficha.id);
  redirect(r.ok ? "/minha-conta/sacolinha?envio=1" : `/minha-conta/sacolinha?erro=${encodeURIComponent(r.erro)}`);
}

/** Cliente logada (a fornecedora ganha o perfil de cliente, como na estrela). Sem login, leva para entrar e voltar. */
async function clienteParaAviso(voltar: string) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/entrar?voltar=${encodeURIComponent(voltar)}`);
  if (!podeAcessar(usuario.perfis, "area-cliente")) {
    if (!podeAcessar(usuario.perfis, "area-fornecedora")) redirect("/sem-acesso");
    await tornarTambemCliente(usuario.id);
  }
  return fichaDaCliente(usuario);
}

/** "Me avise quando chegar": do formulário em Minha conta > Avisos ou do atalho na vitrine. */
export async function criarAviso(dados: FormData) {
  const voltar = enderecoDeVoltaSeguro(dados.get("voltar")) ?? "/minha-conta/avisos";
  const ficha = await clienteParaAviso(voltar);
  const valores = Object.fromEntries(
    ["tamanho", "publico", "categoria", "marca"].map((c) => [c, typeof dados.get(c) === "string" ? String(dados.get(c)) : ""]),
  );
  const lido = lerAlerta(valores);
  const r = lido.ok ? await criarAlerta(ficha.id, lido.alerta) : lido;
  if (!r.ok) {
    const busca = new URLSearchParams({ ...valores, erro: r.erro });
    redirect(`/minha-conta/avisos?${busca.toString()}`);
  }
  redirect("/minha-conta/avisos?criado=1");
}

export async function apagarAviso(dados: FormData) {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/avisos");
  const ficha = await fichaDaCliente(usuario);
  await apagarAlerta(String(dados.get("id") ?? ""), ficha.id);
  refresh();
}
