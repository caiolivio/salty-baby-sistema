"use server";

import { signIn } from "@/auth";
import { lerCadastro } from "@/lib/clientes/conta";
import { criarContaDeCliente } from "@/lib/clientes/contas";
import { conferirEnvioHumano, novoDesafio, type Desafio } from "@/lib/desafio/servidor";
import { enderecoDeVoltaSeguro } from "@/lib/permissoes";
import { linkWhatsapp, WHATSAPP_LOJA } from "@/lib/vitrine";

export type EstadoCadastro =
  | {
      erro: string;
      ajuda?: { texto: string; link: string };
      nome?: string;
      email?: string;
      telefone?: string;
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
    desafio: await novoDesafio(),
  };
  const lido = lerCadastro(valores);
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
    const link = linkWhatsapp(
      process.env.WHATSAPP_LOJA || WHATSAPP_LOJA,
      `Oi! Quero criar minha conta no site da Salty Baby. Meu nome é ${lido.dados.nome} e meu e-mail é ${lido.dados.email}.`,
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
