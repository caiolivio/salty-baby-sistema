"use server";

import { signIn } from "@/auth";
import { lerCadastro } from "@/lib/clientes/conta";
import { criarContaDeCliente } from "@/lib/clientes/contas";
import { conferirEnvioHumano, novoDesafio, type Desafio } from "@/lib/desafio/servidor";
import { enderecoDeVoltaSeguro } from "@/lib/permissoes";
import { linkWhatsapp } from "@/lib/vitrine";
import { lerLoja } from "@/lib/loja/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";

export type EstadoCadastro =
  | {
      erro: string;
      ajuda?: { texto: string; link: string };
      nome?: string;
      email?: string;
      telefone?: string;
      mensagens?: boolean;
      bebeNome?: string;
      bebeNascimento?: string;
      bebeSexo?: string;
      /** Imagem nova do desafio contra robôs (a anterior já foi usada). */
      desafio?: Desafio;
    }
  | undefined;

// Cadastro público: qualquer pessoa pode criar a própria conta de cliente.
export async function cadastrar(_estado: EstadoCadastro, dados: FormData): Promise<EstadoCadastro> {
  const valores = Object.fromEntries(dados.entries());
  const digitado = {
    nome: String(valores.nome ?? ""),
    email: String(valores.email ?? ""),
    telefone: String(valores.telefone ?? ""),
    mensagens: valores.mensagens === "sim",
    bebeNome: String(valores.bebeNome ?? ""),
    bebeNascimento: String(valores.bebeNascimento ?? ""),
    bebeSexo: String(valores.bebeSexo ?? ""),
    desafio: await novoDesafio(),
  };
  const lido = lerCadastro(valores, hojeEmSaoPaulo());
  if (!lido.ok) return { erro: lido.erro, ...digitado };
  const robo = await conferirEnvioHumano(dados);
  if (robo) return { erro: robo, ...digitado };

  const resultado = await criarContaDeCliente(lido.dados);
  if (!resultado.ok) {
    if (resultado.motivo === "email-em-uso") {
      return { erro: "Já existe uma conta com este e-mail. Entre com ele e a sua senha.", ...digitado };
    }
    if (resultado.motivo === "whatsapp-com-conta") {
      return { erro: "Este WhatsApp já tem uma conta. Entre com o e-mail e a senha dela.", ...digitado };
    }
    // O WhatsApp está no cadastro da loja com outro e-mail: a loja confirma quem é e libera o acesso.
    const loja = await lerLoja();
    const link = linkWhatsapp(
      loja.whatsapp,
      `Oi! Quero criar minha conta no site da ${loja.nome}. Meu nome é ${lido.dados.nome} e meu e-mail é ${lido.dados.email}.`,
    );
    return {
      erro: "Seu WhatsApp já está no cadastro da loja. Para proteger suas compras, a loja libera o acesso para você.",
      ajuda: link ? { texto: "Pedir o acesso à loja no WhatsApp", link } : undefined,
      ...digitado,
    };
  }

  await signIn("credentials", {
    email: lido.dados.email,
    senha: lido.dados.senha,
    redirectTo: enderecoDeVoltaSeguro(valores.voltar) ?? "/minha-conta",
  });
}
