// Configurações da loja: marca, contato e regras que mudam de uma loja para
// outra. Funções puras, sem banco, para poderem ser testadas.

import { z } from "zod";
import { lerPercentual } from "../importacao/notion";
import { contraste, CONTRASTE_MINIMO } from "./cores";

export type Loja = {
  nome: string;
  nomeCurto: string;
  slogan: string | null;
  descricao: string | null;
  /** Só números, com o 55 do Brasil. */
  whatsapp: string;
  instagram: string | null;
  corDestaque: string;
  corPrincipal: string;
  corTexto: string;
  logo: string | null;
  icone: string | null;
  prefixoLoja: string;
  /** Pontos-base (4000 = 40%). */
  repassePadrao: number;
  minutosReserva: number;
  mesesDevolucao: number;
};

/** Os dados da Salty Baby, os mesmos que a migração grava. Valem se o banco ainda não respondeu. */
export const LOJA_PADRAO: Loja = {
  nome: "Salty Baby",
  nomeCurto: "Salty",
  slogan: "Moda Sustentável",
  descricao: "Brechó infantil em Caraguatatuba-SP",
  whatsapp: "5512981053623",
  instagram: null,
  corDestaque: "#32AFB5",
  corPrincipal: "#13506E",
  corTexto: "#13212B",
  logo: null,
  icone: null,
  prefixoLoja: "SB",
  repassePadrao: 4000,
  minutosReserva: 15,
  mesesDevolucao: 6,
};

/** Logo e ícone de quando a loja ainda não enviou os dela. */
export const LOGO_PADRAO = "/marca/logo-salty-baby-400px.png";
export const ICONE_PADRAO = "/marca/icone-salty-baby.png";

// ---------------------------------------------------------------- cores

const HEX = /^#[0-9a-f]{6}$/i;

export { contraste, CONTRASTE_MINIMO } from "./cores";

/** Variáveis de cor do site. As cores já foram conferidas (#RRGGBB), então não há como injetar CSS. */
export function cssDasCores(loja: Pick<Loja, "corDestaque" | "corPrincipal" | "corTexto">): string {
  const cores = [loja.corDestaque, loja.corPrincipal, loja.corTexto];
  if (!cores.every((c) => HEX.test(c))) return "";
  return `:root{--turquesa:${loja.corDestaque};--petroleo:${loja.corPrincipal};--tinta:${loja.corTexto}}`;
}

// ---------------------------------------------------------------- formulário

const texto = (minimo: number, maximo: number, nome: string) =>
  z
    .string()
    .trim()
    .min(minimo, `Escreva ${nome}.`)
    .max(maximo, `Use no máximo ${maximo} caracteres em ${nome}.`);

const opcional = (maximo: number, nome: string) =>
  z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres em ${nome}.`)
    .transform((t) => t || null);

const cor = (nome: string) =>
  z
    .string()
    .trim()
    .refine((t) => HEX.test(t), `Escolha a cor ${nome}.`)
    .transform((t) => t.toUpperCase());

const inteiro = (minimo: number, maximo: number, mensagem: string) =>
  z
    .string()
    .trim()
    .refine((t) => /^\d+$/.test(t) && Number(t) >= minimo && Number(t) <= maximo, mensagem)
    .transform(Number);

/** WhatsApp da loja: aceita com ou sem o 55; guarda com o 55. */
const whatsapp = z.string().transform((t, ctx) => {
  let digitos = t.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (!/^55\d{10,11}$/.test(digitos)) {
    ctx.addIssue({ code: "custom", message: "Escreva o WhatsApp da loja com DDD, por exemplo (11) 98765-4321." });
    return z.NEVER;
  }
  return digitos;
});

/** "@saltybaby", "saltybaby" ou o link do perfil → "saltybaby". */
const instagram = z.string().transform((t, ctx) => {
  const usuario = t
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  if (usuario && !/^[a-z0-9._]{1,30}$/i.test(usuario)) {
    ctx.addIssue({ code: "custom", message: "Confira o Instagram: só o nome do perfil, por exemplo @saltybaby." });
    return z.NEVER;
  }
  return usuario || null;
});

const repasse = z.string().transform((t, ctx) => {
  let valor: number | undefined;
  try {
    valor = lerPercentual(t);
  } catch {
    valor = undefined;
  }
  if (valor === undefined || valor > 10000) {
    ctx.addIssue({ code: "custom", message: "Escreva o repasse padrão de 0 a 100, por exemplo 40." });
    return z.NEVER;
  }
  return valor;
});

/**
 * Prefixo do código das peças da loja: 2 a 4 letras maiúsculas. Não pode ser
 * "F" seguido de número (é o código das fornecedoras) nem só "F".
 */
const prefixo = z
  .string()
  .trim()
  .transform((t) => t.toUpperCase())
  .refine((t) => /^[A-Z]{2,4}$/.test(t), "O prefixo das peças da loja tem de 2 a 4 letras, por exemplo SB.");

export const camposLoja = z.object({
  nome: texto(2, 80, "o nome da loja"),
  nomeCurto: texto(2, 40, "o nome curto"),
  slogan: opcional(120, "o slogan"),
  descricao: opcional(160, "a descrição"),
  whatsapp,
  instagram,
  corDestaque: cor("de destaque"),
  corPrincipal: cor("principal"),
  corTexto: cor("do texto"),
  prefixoLoja: prefixo,
  repassePadrao: repasse,
  minutosReserva: inteiro(5, 1440, "A reserva vai de 5 a 1440 minutos (24 horas)."),
  mesesDevolucao: inteiro(0, 36, "O prazo para pedir a peça de volta vai de 0 a 36 meses."),
});

export type DadosLoja = z.output<typeof camposLoja>;

/**
 * Lê o formulário de /painel/configuracoes. `prefixoFixo` é o prefixo atual
 * quando já existem peças da loja com ele: aí ele não pode mudar.
 */
export function lerFormularioLoja(
  valores: Record<string, unknown>,
  prefixoFixo?: string,
): { ok: true; dados: DadosLoja } | { ok: false; erro: string } {
  const comoTexto = Object.fromEntries(
    Object.keys(camposLoja.shape).map((k) => [k, typeof valores[k] === "string" ? valores[k] : ""]),
  );
  if (prefixoFixo) comoTexto.prefixoLoja = prefixoFixo;
  const lido = camposLoja.safeParse(comoTexto);
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  const d = lido.data;
  for (const [nome, valor] of [
    ["principal", d.corPrincipal],
    ["do texto", d.corTexto],
  ] as const) {
    if (contraste(valor, "#FFFFFF") < CONTRASTE_MINIMO) {
      return { ok: false, erro: `A cor ${nome} está clara demais para ler sobre o fundo branco. Escolha um tom mais escuro.` };
    }
  }
  return { ok: true, dados: d };
}

// ---------------------------------------------------------------- textos

/** "(12) 98105-3623" a partir de "5512981053623". */
export function whatsappNaTela(digitos: string): string {
  const sem55 = digitos.startsWith("55") ? digitos.slice(2) : digitos;
  if (!/^\d{10,11}$/.test(sem55)) return digitos;
  return `(${sem55.slice(0, 2)}) ${sem55.slice(2, -4)}-${sem55.slice(-4)}`;
}

/** "Salty Baby · Moda Sustentável". */
export function nomeComSlogan(loja: Pick<Loja, "nome" | "slogan">): string {
  return loja.slogan ? `${loja.nome} · ${loja.slogan}` : loja.nome;
}
