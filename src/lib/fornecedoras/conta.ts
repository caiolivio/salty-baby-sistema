// Conta da fornecedora no site: dados que ela mesma completa (no primeiro
// acesso e em "Meus dados") e o link de primeiro acesso. Funções puras, testadas.

import { z } from "zod";
import { VALIDADE_LINK_DIAS } from "../clientes/conta";
import { lerTelefoneCliente } from "../pedidos/regras";
import { normalizarEmail } from "../senha";
import { lerChavePix, type FormaRecebimento, type TipoChavePix } from "./contrato";

const opcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres.`)
    .transform((t) => t || null);

const campos = z.object({
  nome: z.string().trim().min(2, "Escreva seu nome.").max(160, "Use no máximo 160 caracteres no nome."),
  email: z
    .string()
    .trim()
    .min(1, "Escreva seu e-mail. Ele é obrigatório para entrar na sua área.")
    .max(191, "Confira o e-mail.")
    .refine((t) => z.email().safeParse(t).success, "Confira o e-mail.")
    .transform(normalizarEmail),
  telefone: z.string().transform((t, ctx) => {
    if (!t.trim()) return null;
    const lido = lerTelefoneCliente(t);
    if (!lido) {
      ctx.addIssue({ code: "custom", message: "Escreva o WhatsApp com DDD, por exemplo (11) 98765-4321." });
      return z.NEVER;
    }
    return lido;
  }),
  endereco: z.string().trim().min(5, "Escreva seu endereço (rua, número e bairro).").max(255, "Use no máximo 255 caracteres no endereço."),
  cep: opcional(15),
  cidade: opcional(100),
  estado: opcional(60),
  pix: opcional(191),
  pixTipo: z.enum(["", "cpf", "telefone", "email", "aleatoria"]).transform((t) => (t || null) as TipoChavePix | null),
  recebimentoPreferido: z.enum(["", "pix", "credito"]).transform((t) => (t || null) as FormaRecebimento | null),
});

export type DadosDaFornecedora = z.output<typeof campos>;

/** Dados que a fornecedora completa. Obrigatórios: nome, e-mail e endereço. */
export function lerDadosDaFornecedora(
  valores: Record<string, unknown>,
): { ok: true; dados: DadosDaFornecedora } | { ok: false; erro: string } {
  const lido = campos.safeParse(
    Object.fromEntries(Object.keys(campos.shape).map((k) => [k, typeof valores[k] === "string" ? valores[k] : ""])),
  );
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  const dados = lido.data;
  // Com o tipo escolhido, a chave Pix precisa combinar com ele.
  if (dados.pix && dados.pixTipo) {
    const chave = lerChavePix(dados.pixTipo, dados.pix);
    if (!chave.ok) return { ok: false, erro: chave.erro };
    dados.pix = chave.chave;
  }
  if (!dados.pix) dados.pixTipo = null;
  return { ok: true, dados };
}

/**
 * Mensagem que a loja manda no WhatsApp com o link de primeiro acesso: explica o que
 * tem na área, os passos do cadastro e avisa que depois dá para instalar o app.
 * Negrito no formato do WhatsApp (*texto*).
 */
export function mensagemDoConvite(nome: string, link: string, nomeLoja = "Salty Baby"): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! Aqui é da ${nomeLoja} 💛`,
    [
      "Agora você tem uma *área só sua* no nosso site, para acompanhar tudo em tempo real:",
      "• suas peças e a situação de cada uma",
      "• suas vendas e quanto você tem a receber",
      "• os comprovantes dos pagamentos e o relatório do mês",
      "• enviar fotos de peças novas",
      `• comprar na ${nomeLoja} usando o seu saldo`,
    ].join("\n"),
    [
      "*Como começar* (leva uns 3 minutos):",
      "1. Toque no link abaixo",
      "2. Confira seus dados e crie sua senha",
      "3. Leia e aceite o acordo de consignação",
    ].join("\n"),
    `Seu link (vale por ${VALIDADE_LINK_DIAS} dias e funciona uma vez só):\n${link}`,
    "No final, o site mostra como colocar a loja na tela inicial do celular ou do computador, como um aplicativo. Qualquer dúvida, é só responder aqui 🐳",
  ].join("\n\n");
}

/** Passos do primeiro acesso das fornecedoras que já eram parceiras (importadas). */
export const PASSOS_PRIMEIRO_ACESSO = ["Seus dados", "Acordo", "Concluído"] as const;

/**
 * Em que ponto do cadastro a fornecedora está. A área só abre ("liberada")
 * depois dos dados obrigatórios, do aceite do acordo e da página de parabéns.
 */
export function etapaDaFornecedora(f: {
  nome: string;
  email: string | null;
  endereco: string | null;
  termosAceitosEm: Date | null;
  boasVindasEm: Date | null;
}): "dados" | "acordo" | "parabens" | "liberada" {
  if (f.nome.trim().length < 2 || !f.email?.trim() || !f.endereco?.trim()) return "dados";
  if (!f.termosAceitosEm) return "acordo";
  if (!f.boasVindasEm) return "parabens";
  return "liberada";
}
