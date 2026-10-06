// Conta da cliente no site (área do cliente): regras dos formulários de
// cadastro, perfil e senha, e do link de criar senha. Funções puras, testadas.

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { lerTelefoneCliente } from "../pedidos/regras";
import { normalizarEmail, problemaNaSenha } from "../senha";

/** Quantos dias o link de criar senha vale. */
export const VALIDADE_LINK_DIAS = 7;

const campos = {
  nome: z.string().trim().min(2, "Escreva seu nome.").max(160, "Use no máximo 160 caracteres no nome."),
  email: z
    .string()
    .trim()
    .max(191, "Confira o e-mail.")
    .refine((t) => z.email().safeParse(t).success, "Confira o e-mail.")
    .transform(normalizarEmail),
  telefone: z.string().transform((t, ctx) => {
    const lido = lerTelefoneCliente(t);
    if (!lido) {
      ctx.addIssue({ code: "custom", message: "Escreva o WhatsApp com DDD, por exemplo (11) 98765-4321." });
      return z.NEVER;
    }
    return lido;
  }),
};

const texto = (valores: Record<string, unknown>, nome: string) =>
  typeof valores[nome] === "string" ? (valores[nome] as string) : "";

type Lido<T> = { ok: true; dados: T } | { ok: false; erro: string };

function conferirSenhas(senha: string, confirmacao: string): string | undefined {
  return problemaNaSenha(senha) ?? (senha !== confirmacao ? "As duas senhas não são iguais." : undefined);
}

export type DadosPerfil = { nome: string; email: string; telefone: string };

/** Nome, e-mail e WhatsApp: os dados que a cliente mantém na área dela. */
export function lerPerfil(valores: Record<string, unknown>): Lido<DadosPerfil> {
  const lido = z.object(campos).safeParse({
    nome: texto(valores, "nome").replace(/\s+/g, " "),
    email: texto(valores, "email"),
    telefone: texto(valores, "telefone"),
  });
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  return { ok: true, dados: lido.data };
}

export type EnderecoDoPerfil = { endereco: string | null; cep: string | null; cidade: string | null; estado: string | null };

/** Endereço que a cliente informa em "Meus dados" (opcional, para o envio). */
export function lerEnderecoDoPerfil(valores: Record<string, unknown>): Lido<EnderecoDoPerfil> {
  const limites = { endereco: 255, cep: 15, cidade: 100, estado: 60 } as const;
  const dados = {} as Record<keyof EnderecoDoPerfil, string | null>;
  for (const [campo, maximo] of Object.entries(limites) as [keyof EnderecoDoPerfil, number][]) {
    const t = texto(valores, campo).trim().replace(/\s+/g, " ");
    if (t.length > maximo) return { ok: false, erro: `Use no máximo ${maximo} caracteres em ${campo === "cep" ? "CEP" : campo}.` };
    dados[campo] = t || null;
  }
  return { ok: true, dados };
}

export type DadosCadastro = DadosPerfil & { senha: string };

/** Cadastro feito pela própria cliente no site. Precisa aceitar o aviso de privacidade. */
export function lerCadastro(valores: Record<string, unknown>): Lido<DadosCadastro> {
  const perfil = lerPerfil(valores);
  if (!perfil.ok) return perfil;
  const senha = texto(valores, "senha");
  const problema = conferirSenhas(senha, texto(valores, "confirmacao"));
  if (problema) return { ok: false, erro: problema };
  if (valores.privacidade !== "sim") return { ok: false, erro: "Para criar a conta, aceite o aviso de privacidade." };
  return { ok: true, dados: { ...perfil.dados, senha } };
}

/** Nova senha (troca na área do cliente ou pelo link): duas vezes igual. */
export function lerNovaSenha(valores: Record<string, unknown>): Lido<string> {
  const senha = texto(valores, "senha");
  const problema = conferirSenhas(senha, texto(valores, "confirmacao"));
  return problema ? { ok: false, erro: problema } : { ok: true, dados: senha };
}

/**
 * Código do link de criar senha: aleatório, para ninguém adivinhar. Só letras
 * minúsculas e números, porque o site corrige endereços com maiúsculas.
 */
export function gerarCodigoDoLink(): string {
  return randomBytes(20).toString("hex");
}

/** No banco fica só o hash: quem vir a tabela não consegue usar o link. */
export function hashDoCodigo(codigo: string): string {
  return createHash("sha256").update(codigo).digest("hex");
}

/** Só aceita códigos no formato gerado, antes de consultar o banco. */
export function codigoValido(codigo: unknown): codigo is string {
  return typeof codigo === "string" && /^[0-9a-f]{40}$/.test(codigo);
}

export function fimDoLink(agora: Date): Date {
  return new Date(agora.getTime() + VALIDADE_LINK_DIAS * 86_400_000);
}

/** Mensagem que a loja manda no WhatsApp com o link de criar senha. */
export function mensagemDoLink(nome: string, link: string, novaConta: boolean, nomeLoja = "Salty Baby"): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! Aqui é da ${nomeLoja} 💛`,
    novaConta
      ? "Criamos sua conta no nosso site. Nela você vê suas compras, seus favoritos e peças escolhidas para você."
      : "Aqui está o link para você criar uma nova senha no nosso site.",
    `Toque no link para criar sua senha (vale por ${VALIDADE_LINK_DIAS} dias): ${link}`,
  ].join("\n\n");
}
