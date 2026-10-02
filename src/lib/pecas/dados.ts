// Regras do cadastro de peça (CLAUDE.md, "Peça" e "Códigos"). Funções puras,
// sem banco, para poderem ser testadas.

import { z } from "zod";
import { lerPercentual, lerReais } from "../importacao/notion";
import { TAMANHOS } from "../tamanhos";

export const GENEROS = [
  { valor: "masculino", nome: "Masculino" },
  { valor: "feminino", nome: "Feminino" },
  { valor: "unissex", nome: "Unissex" },
] as const;

/** Nota da peça: de 5 a 10. */
export const NOTA_MINIMA = 5;
export const NOTA_MAXIMA = 10;

export const CONSERVACOES = [
  { valor: "nova_com_etiqueta", nome: "Nova com etiqueta" },
  { valor: "seminova", nome: "Seminova" },
  { valor: "com_marcas_de_uso", nome: "Com marcas de uso" },
] as const;

/**
 * Status que o cadastro pode escolher. Os de venda só mudam pela venda.
 * "Não listado" é uma peça à venda que não aparece na vitrine: só quem tem o
 * link vê (no banco, status publicada com `naoListada`).
 */
export const SITUACOES_DO_CADASTRO = [
  { valor: "rascunho", nome: "Rascunho (não aparece para ninguém)" },
  { valor: "publicada", nome: "À venda" },
  { valor: "nao_listada", nome: "Não listado (só quem tem o link vê)" },
  { valor: "devolvida", nome: "Devolvida à fornecedora" },
  { valor: "doada", nome: "Doada" },
  { valor: "baixa", nome: "Baixa (avaria ou perda)" },
] as const;

export type SituacaoDoCadastro = (typeof SITUACOES_DO_CADASTRO)[number]["valor"];

export function situacaoEditavel(status: string): status is SituacaoDoCadastro {
  return SITUACOES_DO_CADASTRO.some((s) => s.valor === status);
}

/** Valor do campo Status no formulário, a partir do que está no banco. */
export function statusNoFormulario(status: string, naoListada: boolean): string {
  return status === "publicada" && naoListada ? "nao_listada" : status;
}

/** Depois da venda a peça só anda entre estes (entrega); voltar ao estoque exigiria desfazer a venda. */
export const SITUACOES_DEPOIS_DA_VENDA = [
  { valor: "vendida", nome: "Vendida" },
  { valor: "na_sacolinha", nome: "Na sacolinha" },
  { valor: "enviada", nome: "Enviada" },
  { valor: "retirada", nome: "Retirada" },
] as const;

const NOMES_EM_ANDAMENTO: Record<string, string> = {
  reservada: "Reservada (num pedido)",
  devolucao_pedida: "Devolução pedida",
};

export type OpcaoDeStatus = { valor: string; nome: string };

/**
 * Status que a página da peça oferece, a partir do atual.
 * - Reservada: qualquer status do cadastro (a peça sai do pedido).
 * - Devolução pedida: "Devolvida" conclui o pedido de devolução; os outros cancelam.
 * - Vendida e depois: só os passos da entrega.
 */
export function opcoesDeStatus(atual: string): OpcaoDeStatus[] {
  if (SITUACOES_DEPOIS_DA_VENDA.some((s) => s.valor === atual)) return [...SITUACOES_DEPOIS_DA_VENDA];
  if (situacaoEditavel(atual)) return [...SITUACOES_DO_CADASTRO];
  return [{ valor: atual, nome: NOMES_EM_ANDAMENTO[atual] ?? atual }, ...SITUACOES_DO_CADASTRO];
}

/** O que acontece ao trocar o status de uma peça reservada ou com devolução pedida (dica na tela). */
export function avisoDaTroca(atual: string): string | null {
  if (atual === "reservada") return "Ao trocar, a peça sai do pedido em que está (se for a única, o pedido é cancelado).";
  if (atual === "devolucao_pedida") {
    return "Escolha \"Devolvida\" para concluir a devolução. Outro status cancela o pedido de devolução da fornecedora.";
  }
  if (SITUACOES_DEPOIS_DA_VENDA.some((s) => s.valor === atual)) {
    return "Peça vendida: dá para marcar a entrega. Para ela voltar ao estoque, a venda precisa ser desfeita.";
  }
  return null;
}

/** Por que a peça não pode ser excluída (null = pode). */
export function motivoParaNaoExcluir(peca: { status: string; vendas: number; pedidoAberto: number | null }): string | null {
  if (peca.vendas > 0) {
    return "Esta peça já foi vendida, e a venda guarda o repasse e o lucro dela. Para tirá-la do estoque, use o status \"Baixa\".";
  }
  if (peca.pedidoAberto !== null) return `Esta peça está no pedido nº ${peca.pedidoAberto}. Tire-a do pedido antes de excluir.`;
  if (peca.status === "devolucao_pedida") return "A fornecedora pediu esta peça de volta. Resolva em Devoluções antes de excluir.";
  return null;
}

/** Valor da fornecedora no formulário para as peças da própria loja. */
export const FORNECEDORA_LOJA = "loja";

const texto = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres.`)
    .transform((t) => t || null);

const opcao = <T extends readonly { valor: string }[]>(lista: T, mensagem: string) =>
  z
    .string()
    .refine((v) => v === "" || lista.some((o) => o.valor === v), mensagem)
    .transform((v) => (v || null) as T[number]["valor"] | null);

/** "R$ 1.234,56", "45", "45,9" → centavos. Vazio vira null. */
const reais = (nome: string) =>
  z.string().transform((t, ctx) => {
    try {
      const limpo = t.trim();
      if (!limpo) return null;
      const valor = lerReais(limpo);
      if (valor < 0) throw new Error();
      return valor;
    } catch {
      ctx.addIssue({ code: "custom", message: `Escreva o ${nome} em reais, por exemplo 45,90.` });
      return z.NEVER;
    }
  });

const percentual = z.string().transform((t, ctx) => {
  try {
    const valor = lerPercentual(t);
    if (valor !== undefined && valor > 10000) throw new Error();
    return valor ?? null;
  } catch {
    ctx.addIssue({ code: "custom", message: "O repasse vai de 0 a 100%, por exemplo 40." });
    return z.NEVER;
  }
});

const campos = z.object({
  nome: z.string().trim().min(2, "Escreva o nome da peça, por exemplo Macacão.").max(160, "Use no máximo 160 caracteres."),
  tamanho: opcao(TAMANHOS, "Escolha um tamanho da lista."),
  genero: opcao(GENEROS, "Escolha o gênero."),
  conservacao: opcao(CONSERVACOES, "Escolha a conservação."),
  nota: z
    .string()
    .transform((t) => (t.trim() === "" ? null : Number(t)))
    .refine((n) => n === null || (Number.isInteger(n) && n >= NOTA_MINIMA && n <= NOTA_MAXIMA), "A nota vai de 5 a 10."),
  variacao: texto(80),
  marca: texto(80),
  cor: texto(80),
  medidas: texto(160),
  descricao: texto(2000),
  precoCentavos: reais("preço"),
  custoCentavos: reais("custo"),
  percentualRepasse: percentual,
  quantidade: z
    .string()
    .transform((t) => (t.trim() === "" ? 1 : Number(t)))
    .refine((n) => Number.isInteger(n) && n >= 0 && n <= 999, "A quantidade vai de 0 a 999."),
  status: opcao(SITUACOES_DO_CADASTRO, "Escolha o status."),
  dataEntrada: z
    .string()
    .refine((t) => t === "" || /^\d{4}-\d{2}-\d{2}$/.test(t), "Confira a data de entrada.")
    .transform((t) => t || null),
});

export type DadosPeca = {
  nome: string;
  tamanho: string | null;
  genero: (typeof GENEROS)[number]["valor"] | null;
  conservacao: (typeof CONSERVACOES)[number]["valor"] | null;
  /** De 5 a 10; vazia nas peças sem nota (como as importadas). */
  nota: number | null;
  variacao: string | null;
  marca: string | null;
  cor: string | null;
  medidas: string | null;
  descricao: string | null;
  precoCentavos: number;
  /** Só nas peças da loja. */
  custoCentavos: number | null;
  /** Pontos-base; só nas peças consignadas. */
  percentualRepasse: number | null;
  quantidade: number;
  status: Exclude<SituacaoDoCadastro, "nao_listada">;
  /** À venda só pelo link (status publicada). */
  naoListada: boolean;
  /** aaaa-mm-dd */
  dataEntrada: string;
};

export type Resultado = { ok: true; dados: DadosPeca } | { ok: false; erro: string };

/**
 * Lê o formulário da peça. `consignada` diz se a peça é de uma fornecedora (tem
 * repasse) ou da loja (tem custo). `repassePadrao` é o da fornecedora, usado
 * quando o campo fica vazio. `hoje` é a data de entrada padrão (aaaa-mm-dd).
 */
export function lerFormularioPeca(
  valores: Record<string, unknown>,
  { consignada, repassePadrao, hoje }: { consignada: boolean; repassePadrao: number; hoje: string },
): Resultado {
  const comoTexto = Object.fromEntries(
    Object.keys(campos.shape).map((k) => [k, typeof valores[k] === "string" ? valores[k] : ""]),
  );
  const lido = campos.safeParse(comoTexto);
  if (!lido.success) return { ok: false, erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  const d = lido.data;

  const escolhido = d.status ?? "rascunho";
  const naoListada = escolhido === "nao_listada";
  const status = naoListada ? "publicada" : escolhido;
  const preco = d.precoCentavos ?? 0;
  // Uma peça à venda precisa de preço (e nunca vende sem valor de venda).
  if (status === "publicada" && preco <= 0) return { ok: false, erro: "Para colocar à venda, escreva o preço." };

  return {
    ok: true,
    dados: {
      ...d,
      status,
      naoListada,
      precoCentavos: preco,
      custoCentavos: consignada ? null : d.custoCentavos,
      percentualRepasse: consignada ? (d.percentualRepasse ?? repassePadrao) : null,
      dataEntrada: d.dataEntrada ?? hoje,
    },
  };
}

/**
 * Categorias marcadas no formulário (pode ser mais de uma). Só valem as que
 * existem e estão ativas; as que a peça já tinha continuam valendo mesmo que a
 * categoria tenha sido desativada depois.
 */
export function escolherCategorias(marcadas: unknown[], permitidas: Iterable<string>): string[] {
  const validas = new Set(permitidas);
  return [...new Set(marcadas.filter((m): m is string => typeof m === "string" && validas.has(m)))];
}

/** Data de hoje em São Paulo, no formato aaaa-mm-dd. */
export function hojeEmSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

/** 4590 → "45,90" para mostrar no campo de preço. */
export function reaisNoCampo(centavos: number | null): string {
  if (centavos === null) return "";
  return `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, "0")}`;
}

/**
 * Nova ordem das fotos depois de mover uma delas para a posição `destino`
 * (0 = foto em destaque). Posições fora da lista ficam na ponta.
 */
export function moverNaLista<T>(lista: readonly T[], item: T, destino: number): T[] {
  const atual = lista.indexOf(item);
  if (atual === -1) return [...lista];
  const resto = lista.filter((_, i) => i !== atual);
  const posicao = Math.max(0, Math.min(resto.length, destino));
  return [...resto.slice(0, posicao), item, ...resto.slice(posicao)];
}
