// Conta da fornecedora no site: dados que ela mesma completa (no primeiro
// acesso e em "Meus dados") e o link de primeiro acesso. Funções puras, testadas.

import { z } from "zod";
import { VALIDADE_LINK_DIAS } from "../clientes/conta";
import { lerTelefoneCliente } from "../pedidos/regras";
import { normalizarEmail } from "../senha";

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
      ctx.addIssue({ code: "custom", message: "Escreva o WhatsApp com DDD, por exemplo (12) 98105-3623." });
      return z.NEVER;
    }
    return lido;
  }),
  endereco: z.string().trim().min(5, "Escreva seu endereço (rua, número e bairro).").max(255, "Use no máximo 255 caracteres no endereço."),
  cep: opcional(15),
  cidade: opcional(100),
  estado: opcional(60),
  pix: opcional(191),
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
  return { ok: true, dados: lido.data };
}

/** Mensagem que a loja manda no WhatsApp com o link de primeiro acesso. */
export function mensagemDoConvite(nome: string, link: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! Aqui é da Salty Baby 💛`,
    "Agora você tem uma área só sua no nosso site, para acompanhar suas peças, suas vendas e quanto tem a receber.",
    `Toque no link para terminar seu cadastro e criar sua senha (vale por ${VALIDADE_LINK_DIAS} dias):`,
    link,
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
