// "Seja uma fornecedora": regras do formulário de inscrição (passo 1), das
// peças propostas (passo 2) e dos passos mostrados na tela. Funções puras, testadas.

import { z } from "zod";
import { lerTelefoneCliente } from "../pedidos/regras";
import { CONSERVACOES, GENEROS } from "../pecas/dados";
import { normalizarEmail } from "../senha";
import { TAMANHOS } from "../tamanhos";

/** No passo 1 a pessoa mostra até 5 peças, cada uma com foto e descrição. */
export const LIMITE_PECAS_INSCRICAO = 5;

const texto = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres.`)
    .transform((t) => t || null);

const camposInscricao = z.object({
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
      ctx.addIssue({ code: "custom", message: "Escreva o WhatsApp com DDD, por exemplo (12) 98105-3623." });
      return z.NEVER;
    }
    return lido;
  }),
  endereco: z.string().trim().min(5, "Escreva seu endereço.").max(255, "Use no máximo 255 caracteres no endereço."),
  cep: texto(15),
  cidade: texto(100),
  estado: texto(60),
});

export type DadosInscricao = z.output<typeof camposInscricao> & { pecas: string[] };

const comoTexto = (valores: Record<string, unknown>, nome: string) =>
  typeof valores[nome] === "string" ? (valores[nome] as string) : "";

/**
 * Lê a inscrição. `pecas` são as peças preenchidas na ordem da tela, com a
 * descrição e se veio foto. Linha sem foto e sem descrição é ignorada.
 */
export function lerInscricao(
  valores: Record<string, unknown>,
  pecas: { descricao: string; temFoto: boolean }[],
): { ok: true; dados: DadosInscricao } | { ok: false; erro: string } {
  const lido = camposInscricao.safeParse(
    Object.fromEntries(Object.keys(camposInscricao.shape).map((k) => [k, comoTexto(valores, k)])),
  );
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };

  const preenchidas = pecas
    .map((p) => ({ descricao: p.descricao.trim(), temFoto: p.temFoto }))
    .filter((p) => p.descricao || p.temFoto);
  if (preenchidas.length === 0) return { ok: false, erro: "Mostre pelo menos uma peça, com foto e descrição." };
  if (preenchidas.length > LIMITE_PECAS_INSCRICAO) {
    return { ok: false, erro: `Nesta primeira etapa, mostre no máximo ${LIMITE_PECAS_INSCRICAO} peças.` };
  }
  for (const [i, p] of preenchidas.entries()) {
    if (!p.temFoto) return { ok: false, erro: `Falta a foto da peça ${i + 1}.` };
    if (!p.descricao) return { ok: false, erro: `Escreva uma descrição curta da peça ${i + 1}.` };
    if (p.descricao.length > 500) return { ok: false, erro: `A descrição da peça ${i + 1} pode ter até 500 caracteres.` };
  }
  if (valores.privacidade !== "sim") return { ok: false, erro: "Para enviar, aceite o aviso de privacidade." };
  return { ok: true, dados: { ...lido.data, pecas: preenchidas.map((p) => p.descricao) } };
}

const opcao = <T extends readonly { valor: string }[]>(lista: T, mensagem: string) =>
  z
    .string()
    .refine((v) => v === "" || lista.some((o) => o.valor === v), mensagem)
    .transform((v) => (v || null) as T[number]["valor"] | null);

const camposProposta = z.object({
  nome: z.string().trim().min(2, "Escreva o nome da peça (ex.: Vestido de festa).").max(160, "Use no máximo 160 caracteres."),
  descricao: z.string().trim().min(2, "Escreva uma descrição curta.").max(1000, "Use no máximo 1000 caracteres."),
  tamanho: opcao(TAMANHOS, "Escolha um tamanho da lista."),
  marca: texto(80),
  genero: opcao(GENEROS, "Escolha para quem é a peça."),
  conservacao: opcao(CONSERVACOES, "Escolha a conservação."),
  categoriaId: texto(40),
});

export type DadosProposta = z.output<typeof camposProposta>;

/** Peça proposta na área da fornecedora (passo 2 e depois): foto obrigatória. */
export function lerProposta(
  valores: Record<string, unknown>,
  temFoto: boolean,
): { ok: true; dados: DadosProposta } | { ok: false; erro: string } {
  const lido = camposProposta.safeParse(
    Object.fromEntries(Object.keys(camposProposta.shape).map((k) => [k, comoTexto(valores, k)])),
  );
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  if (!temFoto) return { ok: false, erro: "Inclua uma foto da peça." };
  return { ok: true, dados: lido.data };
}

/** Os 4 passos mostrados no topo das páginas. */
export const PASSOS = ["Inscrição", "Peças e acordo", "Parceria", "Concluído"] as const;
export type SituacaoPasso = "feito" | "atual" | "pendente";

/**
 * Situação de cada passo. `atual` é o passo em que a pessoa está (1 a 4);
 * os anteriores aparecem como feitos.
 */
export function situacaoDosPassos(atual: 1 | 2 | 3 | 4, concluido = false): SituacaoPasso[] {
  return PASSOS.map((_, i) => {
    const numero = i + 1;
    if (numero < atual || (numero === atual && concluido)) return "feito";
    return numero === atual ? "atual" : "pendente";
  });
}

/** Em que passo está cada etapa da candidatura (para a área da fornecedora e o painel). */
export function passoDaEtapa(etapa: string): { atual: 1 | 2 | 3 | 4; concluido: boolean } {
  switch (etapa) {
    case "enviada":
      return { atual: 1, concluido: true };
    case "aprovada":
      return { atual: 2, concluido: false };
    case "acordo_aceito":
      return { atual: 2, concluido: true };
    case "efetivada":
      return { atual: 3, concluido: false };
    default:
      return { atual: 1, concluido: false };
  }
}

export const NOMES_ETAPA: Record<string, string> = {
  enviada: "Aguardando curadoria",
  aprovada: "Aprovada no passo 1 (fazendo o passo 2)",
  acordo_aceito: "Passo 2 feito (falta efetivar)",
  efetivada: "Parceira (fornecedora)",
  recusada: "Recusada",
};

/** Mensagem que a loja manda no WhatsApp quando aprova o passo 1. */
export function mensagemDeAprovacao(nome: string, link: string, novaConta: boolean): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! Aqui é da Salty Baby 💛`,
    "Suas peças foram aprovadas na curadoria! Agora falta o passo 2: mostrar mais peças, com os detalhes, e ler e aceitar as regras da consignação.",
    novaConta
      ? "Toque no link para criar sua senha e entrar na sua área de fornecedora (o link vale por 7 dias):"
      : "Toque no link para criar uma nova senha e entrar na sua área de fornecedora (o link vale por 7 dias):",
    link,
  ].join("\n\n");
}
