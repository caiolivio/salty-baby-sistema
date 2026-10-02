// Equipe (suporte): regras do formulário de Painel > Equipe e do que vai para o
// histórico. Funções puras, sem banco, para poderem ser testadas.

import { z } from "zod";
import { VALIDADE_LINK_DIAS } from "../clientes/conta";
import type { Mudanca } from "../historico/regras";
import { lerTelefoneCliente } from "../pedidos/regras";
import { EXTRAS, PAGINAS, type Acesso } from "../permissoes";
import { normalizarEmail } from "../senha";

const camposSuporte = z.object({
  nome: z.string().trim().min(2, "Escreva o nome da pessoa.").max(120, "Use no máximo 120 caracteres no nome."),
  email: z
    .string()
    .trim()
    .max(191, "E-mail longo demais.")
    .refine((t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t), "Escreva um e-mail válido. É com ele que a pessoa entra.")
    .transform(normalizarEmail),
  whatsapp: z.string().transform((t, ctx) => {
    if (!t.trim()) return null;
    const digitos = lerTelefoneCliente(t);
    if (!digitos) {
      ctx.addIssue({ code: "custom", message: "Escreva o WhatsApp com DDD, por exemplo (11) 98765-4321." });
      return z.NEVER;
    }
    return digitos;
  }),
});

export type DadosSuporte = z.output<typeof camposSuporte>;

export function lerFormularioSuporte(
  valores: Record<string, unknown>,
): { ok: true; dados: DadosSuporte } | { ok: false; erro: string } {
  const comoTexto = Object.fromEntries(
    Object.keys(camposSuporte.shape).map((k) => [k, typeof valores[k] === "string" ? valores[k] : ""]),
  );
  const lido = camposSuporte.safeParse(comoTexto);
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  return { ok: true, dados: lido.data };
}

const NIVEIS = { ver: "Só ver", alterar: "Ver e alterar" } as const;

/** Uma linha do histórico para cada página ou ação que mudou. */
export function mudancasDeAcesso(antes: Acesso, depois: Acesso): Mudanca[] {
  const mudancas: Mudanca[] = [];
  for (const p of PAGINAS) {
    const a = antes.paginas[p.chave];
    const d = depois.paginas[p.chave];
    if (a !== d) {
      mudancas.push({
        campo: `Página ${p.nome}`,
        antes: a ? NIVEIS[a] : "Sem acesso",
        depois: d ? NIVEIS[d] : "Sem acesso",
        restrito: false,
      });
    }
  }
  for (const e of EXTRAS) {
    const a = antes.extras.includes(e.chave);
    const d = depois.extras.includes(e.chave);
    if (a !== d) mudancas.push({ campo: e.nome, antes: a ? "Liberado" : "Não", depois: d ? "Liberado" : "Não", restrito: false });
  }
  return mudancas;
}

/** Mensagem do WhatsApp com o link para o suporte criar a senha. */
export function mensagemDoSuporte(nome: string, link: string, nomeLoja: string, novaConta: boolean): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! Aqui é da ${nomeLoja}.`,
    novaConta
      ? "Criei seu acesso ao painel da loja. Você entra com este e-mail e a senha que criar agora."
      : "Aqui está o link para você criar uma nova senha do painel da loja.",
    `Toque no link para criar sua senha (vale por ${VALIDADE_LINK_DIAS} dias e funciona uma vez): ${link}`,
  ].join("\n\n");
}
