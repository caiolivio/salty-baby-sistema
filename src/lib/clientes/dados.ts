// Regras do cadastro de clientes (CLAUDE.md, "Clientes" e "LGPD").
// Funções puras, sem banco, para poderem ser testadas.

import { z } from "zod";
import { lerTelefoneCliente } from "../pedidos/regras";

const texto = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres.`)
    .transform((t) => t || null);

/** WhatsApp guardado só com os números e o DDD, para achar a cliente pelo telefone. */
const telefone = z.string().transform((t, ctx) => {
  if (!t.trim()) return null;
  const lido = lerTelefoneCliente(t);
  if (!lido) {
    ctx.addIssue({ code: "custom", message: "O WhatsApp precisa ter DDD, por exemplo (12) 98105-3623." });
    return z.NEVER;
  }
  return lido;
});

/** CPF guardado só com os 11 números. Só a administradora vê e altera. */
const cpf = z
  .string()
  .transform((t) => t.replace(/\D/g, ""))
  .refine((d) => d === "" || d.length === 11, "O CPF tem 11 números.")
  .transform((d) => d || null);

export const camposCliente = z.object({
  nome: z.string().trim().min(2, "Escreva o nome da cliente.").max(160, "Use no máximo 160 caracteres."),
  telefone,
  email: z
    .string()
    .trim()
    .max(191)
    .refine((t) => t === "" || z.email().safeParse(t).success, "Confira o e-mail.")
    .transform((t) => t.toLowerCase() || null),
  cpf,
  endereco: texto(255),
  cep: texto(15),
  cidade: texto(100),
  estado: texto(60),
  observacao: texto(2000),
});

export type DadosCliente = z.output<typeof camposCliente>;

const numeros = (t: string | null | undefined) => (t ?? "").replace(/\D/g, "");

/**
 * Lê o formulário. Sem `podeVerCpf` (ajudante), o CPF guardado não muda.
 * O telefone e o CPF que vieram do Notion fora do padrão continuam como estão
 * enquanto ninguém mexer neles.
 */
export function lerFormularioCliente(
  valores: Record<string, unknown>,
  atual: { telefone?: string | null; cpf?: string | null } = {},
  podeVerCpf = true,
): { ok: true; dados: DadosCliente } | { ok: false; erro: string } {
  const t = Object.fromEntries(
    Object.keys(camposCliente.shape).map((k) => [k, typeof valores[k] === "string" ? valores[k] : ""]),
  ) as Record<keyof DadosCliente, string>;
  const manterTelefone = Boolean(atual.telefone) && t.telefone.trim() === atual.telefone;
  const manterCpf = !podeVerCpf || (Boolean(atual.cpf) && numeros(t.cpf) === numeros(atual.cpf));
  const lido = camposCliente.safeParse({ ...t, telefone: manterTelefone ? "" : t.telefone, cpf: manterCpf ? "" : t.cpf });
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  return {
    ok: true,
    dados: {
      ...lido.data,
      telefone: manterTelefone ? (atual.telefone ?? null) : lido.data.telefone,
      cpf: manterCpf ? (atual.cpf ?? null) : lido.data.cpf,
    },
  };
}

/** 12345678901 → 123.456.789-01 */
export function formatarCpf(cpf: string): string {
  const d = numeros(cpf);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

export type DadosCrianca = { nome: string; nascimento: Date | null; sexo: "feminino" | "masculino" | null };

/** Lê o formulário de uma criança. A data vem do campo de data (aaaa-mm-dd) e é opcional. */
export function lerCrianca(
  valores: { nome?: unknown; nascimento?: unknown; sexo?: unknown },
  hoje: string,
): { ok: true; dados: DadosCrianca } | { ok: false; erro: string } {
  const nome = typeof valores.nome === "string" ? valores.nome.trim().replace(/\s+/g, " ") : "";
  if (!nome) return { ok: false, erro: "Escreva o nome da criança." };
  if (nome.length > 80) return { ok: false, erro: "Use no máximo 80 caracteres no nome." };
  const texto = typeof valores.nascimento === "string" ? valores.nascimento.trim() : "";
  let nascimento: Date | null = null;
  if (texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(Date.parse(`${texto}T00:00:00Z`))) {
      return { ok: false, erro: "A data de nascimento não é válida." };
    }
    if (texto > hoje) return { ok: false, erro: "A data de nascimento não pode ser no futuro." };
    if (Number(texto.slice(0, 4)) < Number(hoje.slice(0, 4)) - 25) return { ok: false, erro: "Confira o ano de nascimento." };
    nascimento = new Date(`${texto}T00:00:00Z`);
  }
  const sexo = valores.sexo === "feminino" || valores.sexo === "masculino" ? valores.sexo : null;
  return { ok: true, dados: { nome, nascimento, sexo } };
}
