// Regras dos dados de uma fornecedora (CLAUDE.md, "Códigos" e "Consignação").
// Funções puras, sem banco, para poderem ser testadas.

import { z } from "zod";
import { lerPercentual } from "../importacao/notion";

/** 40% em pontos-base. */
export const REPASSE_PADRAO = 4000;

/**
 * Próximo número de fornecedora. A sequência só cresce, então um código nunca
 * volta a ser usado; e nunca fica abaixo de um número que já existe.
 */
export function numeroSeguro(ultimoDaSequencia: number, maiorExistente: number | null): number {
  return Math.max(ultimoDaSequencia, (maiorExistente ?? 0) + 1);
}

const texto = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres.`)
    .transform((t) => t || null);

/** CPF (11 dígitos) ou CNPJ (14). Guardado só com os números. */
const documento = z
  .string()
  .transform((t) => t.replace(/\D/g, ""))
  .refine((d) => d === "" || d.length === 11 || d.length === 14, "O CPF tem 11 números e o CNPJ tem 14.")
  .transform((d) => d || null);

/** "40", "40%", "37,5" → pontos-base. Vazio vira 40%. */
const percentual = z.string().transform((t, ctx) => {
  let valor: number | undefined;
  try {
    valor = lerPercentual(t);
  } catch {
    valor = undefined;
    ctx.addIssue({ code: "custom", message: "Escreva o repasse como número, por exemplo 40." });
    return z.NEVER;
  }
  if (valor === undefined) return REPASSE_PADRAO;
  if (valor > 10000) {
    ctx.addIssue({ code: "custom", message: "O repasse vai de 0 a 100%." });
    return z.NEVER;
  }
  return valor;
});

export const camposFornecedora = z.object({
  nome: z.string().trim().min(2, "Escreva o nome da fornecedora.").max(160, "Use no máximo 160 caracteres."),
  telefone: texto(40),
  email: z
    .string()
    .trim()
    .max(191)
    .refine((t) => t === "" || z.email().safeParse(t).success, "Confira o e-mail.")
    .transform((t) => t.toLowerCase() || null),
  documento,
  pix: texto(191),
  endereco: texto(255),
  cep: texto(15),
  cidade: texto(100),
  estado: texto(60),
  percentualRepassePadrao: percentual,
});

export type DadosFornecedora = z.output<typeof camposFornecedora>;

const numeros = (t: string | null | undefined) => (t ?? "").replace(/\D/g, "");

/**
 * Lê o formulário. Devolve os dados prontos para gravar ou a primeira mensagem de erro.
 * `documentoAtual` é o CPF/CNPJ já guardado: alguns vieram incompletos do Notion, e
 * isso não pode impedir de salvar outras mudanças enquanto ninguém mexer nele.
 */
export function lerFormularioFornecedora(
  valores: Record<string, unknown>,
  documentoAtual?: string | null,
): { ok: true; dados: DadosFornecedora } | { ok: false; erro: string } {
  const comoTexto = Object.fromEntries(
    Object.keys(camposFornecedora.shape).map((k) => [k, typeof valores[k] === "string" ? valores[k] : ""]),
  );
  const manter = documentoAtual && numeros(comoTexto.documento) === numeros(documentoAtual);
  const lido = camposFornecedora.safeParse(manter ? { ...comoTexto, documento: "" } : comoTexto);
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  return { ok: true, dados: manter ? { ...lido.data, documento: documentoAtual } : lido.data };
}

/** 4000 → "40"; 3750 → "37,5". */
export function mostrarPercentual(pontosBase: number): string {
  return (pontosBase / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
