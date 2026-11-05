// Cupons de desconto (CLAUDE.md, "Descontos"): um código com percentual ou
// valor fixo, validade, limite de usos e pedido mínimo, que pode ser restrito a
// uma cliente, marca, tamanho, gênero ou fornecedora. O desconto vale só para
// as peças que atendem as restrições e é dividido entre elas na proporção do
// preço (já com a promoção). Funções puras, testadas.

import { distribuirDesconto } from "../calculos";
import { formatarReais } from "../dinheiro";
import { lerPercentual, lerReais } from "../importacao/notion";
import { TAMANHOS } from "../tamanhos";
import { descricaoDoDesconto, type TipoDesconto } from "../promocoes/regras";

export const COOKIE_CUPOM = "cupom";

export type RegraDoCupom = {
  id: string;
  codigo: string;
  tipo: TipoDesconto;
  valor: number;
  inicio: string | null;
  fim: string | null;
  limiteUsos: number | null;
  pedidoMinimoCentavos: number;
  porContaDaLoja: boolean;
  ativo: boolean;
  clienteId: string | null;
  marca: string | null;
  tamanho: string | null;
  genero: "masculino" | "feminino" | "unissex" | null;
  fornecedoraId: string | null;
  /** Só na primeira compra pelo site: exige conta e vale uma vez por cliente. */
  soPrimeiraCompra: boolean;
  /** Só para contas criadas neste intervalo (ISO, UTC). */
  cadastroDesde: string | null;
  cadastroAte: string | null;
  /** Vale até N dias depois de a conta ser criada. */
  diasParaUsar: number | null;
};

/** Quem está comprando, para os cupons de boas-vindas. */
export type CompradoraDoCupom = {
  /** Quando a conta do site foi criada (ISO); vazio sem conta. */
  contaCriadaEm: string | null;
  /** Pedidos do site dela que contam (reservados ou pagos). */
  pedidosNoSite: number;
};

/** Peça do carrinho, com o preço que a cliente paga antes do cupom (já com a promoção). */
export type PecaDoCupom = {
  id: string;
  precoCentavos: number;
  marca: string | null;
  tamanho: string | null;
  genero: string | null;
  fornecedoraId: string | null;
};

export type CupomAplicado = {
  cupomId: string;
  codigo: string;
  porContaDaLoja: boolean;
  /** Restrito a algumas peças (marca, tamanho, gênero ou fornecedora). */
  restrito: boolean;
  descontoCentavos: number;
  /** Parte do desconto de cada peça (só as que entram no cupom). */
  porPeca: Record<string, number>;
};

/** Código como a cliente digita: sem espaços, em maiúsculas. */
export function lerCodigoDoCupom(valor: unknown): string | null {
  const t = typeof valor === "string" ? valor.trim().toUpperCase().replace(/\s+/g, "") : "";
  return /^[A-Z0-9_-]{3,30}$/.test(t) ? t : null;
}

const igual = (a: string | null, b: string | null) =>
  (a ?? "").trim().localeCompare((b ?? "").trim(), "pt-BR", { sensitivity: "base" }) === 0;

/** A peça atende as restrições do cupom? Gênero: peça unissex ou sem gênero serve para os dois, como na vitrine. */
export function pecaEntraNoCupom(peca: PecaDoCupom, cupom: Pick<RegraDoCupom, "marca" | "tamanho" | "genero" | "fornecedoraId">) {
  if (cupom.marca && !igual(peca.marca, cupom.marca)) return false;
  if (cupom.tamanho && peca.tamanho !== cupom.tamanho) return false;
  if (cupom.genero && peca.genero && peca.genero !== "unissex" && peca.genero !== cupom.genero) return false;
  if (cupom.fornecedoraId && peca.fornecedoraId !== cupom.fornecedoraId) return false;
  return true;
}

export const restrito = (c: Pick<RegraDoCupom, "marca" | "tamanho" | "genero" | "fornecedoraId">) =>
  Boolean(c.marca || c.tamanho || c.genero || c.fornecedoraId);

/**
 * Aplica o cupom às peças do carrinho, ou diz por que ele não vale.
 * `usos`: pedidos que já usaram o cupom (reservados ou pagos).
 */
export function aplicarCupom(
  cupom: RegraDoCupom | null,
  pecas: readonly PecaDoCupom[],
  contexto: { hoje: string; clienteId: string | null; usos: number; agora?: Date; compradora?: CompradoraDoCupom | null },
): { ok: true; cupom: CupomAplicado } | { ok: false; erro: string } {
  const invalido = { ok: false as const, erro: "Este cupom não existe ou não vale mais." };
  if (!cupom || !cupom.ativo) return invalido;
  if (cupom.inicio && contexto.hoje < cupom.inicio) return { ok: false, erro: "Este cupom ainda não começou a valer." };
  if (cupom.fim && contexto.hoje > cupom.fim) return { ok: false, erro: "Este cupom já venceu." };
  if (cupom.limiteUsos !== null && contexto.usos >= cupom.limiteUsos)
    return { ok: false, erro: "Este cupom já foi usado o máximo de vezes." };
  if (cupom.clienteId && cupom.clienteId !== contexto.clienteId) {
    return contexto.clienteId
      ? { ok: false, erro: "Este cupom é de outra cliente." }
      : { ok: false, erro: "Este cupom é pessoal. Entre na sua conta para usar." };
  }
  const recusa = recusaDeBoasVindas(cupom, contexto.clienteId, contexto.compradora ?? null, contexto.agora ?? new Date());
  if (recusa) return { ok: false, erro: recusa };
  const subtotal = pecas.reduce((s, p) => s + p.precoCentavos, 0);
  if (subtotal < cupom.pedidoMinimoCentavos) {
    return { ok: false, erro: `Este cupom vale para pedidos a partir de ${formatarReais(cupom.pedidoMinimoCentavos)}.` };
  }
  const entram = pecas.filter((p) => pecaEntraNoCupom(p, cupom));
  if (entram.length === 0) return { ok: false, erro: "Nenhuma peça do carrinho entra neste cupom." };
  const base = entram.reduce((s, p) => s + p.precoCentavos, 0);
  const desconto = Math.min(base, cupom.tipo === "reais" ? cupom.valor : Math.floor((base * cupom.valor + 5000) / 10000));
  const pagos = distribuirDesconto(
    entram.map((p) => p.precoCentavos),
    desconto,
  );
  return {
    ok: true,
    cupom: {
      cupomId: cupom.id,
      codigo: cupom.codigo,
      porContaDaLoja: cupom.porContaDaLoja,
      restrito: restrito(cupom),
      descontoCentavos: desconto,
      porPeca: Object.fromEntries(entram.map((p, i) => [p.id, p.precoCentavos - pagos[i]])),
    },
  };
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Cupom de boas-vindas: precisa de conta? */
export const exigeConta = (c: Pick<RegraDoCupom, "soPrimeiraCompra" | "cadastroDesde" | "cadastroAte" | "diasParaUsar">) =>
  c.soPrimeiraCompra || Boolean(c.cadastroDesde || c.cadastroAte || c.diasParaUsar);

/** Último instante em que a cliente pode usar o cupom, pelo prazo contado do cadastro. */
export function usarAte(cupom: Pick<RegraDoCupom, "diasParaUsar">, contaCriadaEm: string | null): Date | null {
  if (!cupom.diasParaUsar || !contaCriadaEm) return null;
  return new Date(Date.parse(contaCriadaEm) + cupom.diasParaUsar * DIA_MS);
}

/** Por que o cupom de boas-vindas não vale para esta cliente (ou null se vale). */
export function recusaDeBoasVindas(
  cupom: Pick<RegraDoCupom, "soPrimeiraCompra" | "cadastroDesde" | "cadastroAte" | "diasParaUsar">,
  clienteId: string | null,
  compradora: CompradoraDoCupom | null,
  agora: Date,
): string | null {
  if (!exigeConta(cupom)) return null;
  if (!clienteId || !compradora?.contaCriadaEm) return "Este cupom é para quem tem cadastro no site. Entre na sua conta ou cadastre-se para usar.";
  const criada = Date.parse(compradora.contaCriadaEm);
  if (cupom.cadastroDesde && criada < Date.parse(cupom.cadastroDesde)) return "Este cupom é só para quem se cadastrou no período da campanha.";
  if (cupom.cadastroAte && criada > Date.parse(cupom.cadastroAte)) return "Este cupom é só para quem se cadastrou no período da campanha.";
  const ate = usarAte(cupom, compradora.contaCriadaEm);
  if (ate && agora.getTime() > ate.getTime()) return `O prazo deste cupom acabou: ele valia até ${cupom.diasParaUsar} dias depois do seu cadastro.`;
  if (cupom.soPrimeiraCompra && compradora.pedidosNoSite > 0) return "Este cupom vale só na primeira compra pelo site.";
  return null;
}

/** Data e hora de São Paulo ("aaaa-mm-ddThh:mm", campo datetime-local) para ISO. O Brasil não tem horário de verão. */
export function lerDataHoraSP(t: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) return null;
  const d = new Date(`${t}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO para o campo datetime-local, na hora de São Paulo. */
export const dataHoraSPNoCampo = (iso: string | null) => (iso ? new Date(Date.parse(iso) - 3 * 60 * 60 * 1000).toISOString().slice(0, 16) : "");

/** "05/11/2026 09:00", na hora de São Paulo. */
export const dataHoraSP = (iso: string) => {
  const [d, h] = dataHoraSPNoCampo(iso).split("T");
  return `${d.split("-").reverse().join("/")} ${h}`;
};

/** "Só na primeira compra pelo site, para quem se cadastrou entre ..., em até 7 dias depois do cadastro". */
export function descricaoDeBoasVindas(c: Pick<RegraDoCupom, "soPrimeiraCompra" | "cadastroDesde" | "cadastroAte" | "diasParaUsar">) {
  const partes = [
    c.soPrimeiraCompra ? "só na primeira compra pelo site" : exigeConta(c) && "só para quem tem cadastro no site",
    c.cadastroDesde && c.cadastroAte
      ? `para quem se cadastrou entre ${dataHoraSP(c.cadastroDesde)} e ${dataHoraSP(c.cadastroAte)}`
      : c.cadastroDesde
        ? `para quem se cadastrou a partir de ${dataHoraSP(c.cadastroDesde)}`
        : c.cadastroAte && `para quem se cadastrou até ${dataHoraSP(c.cadastroAte)}`,
    c.diasParaUsar && `em até ${c.diasParaUsar} ${c.diasParaUsar === 1 ? "dia" : "dias"} depois do cadastro`,
  ].filter(Boolean);
  return partes.join(", ");
}

/** "10% de desconto em peças da marca Carters, tamanho 2, a partir de R$ 50,00". */
export function descricaoDoCupom(
  c: Pick<RegraDoCupom, "tipo" | "valor" | "marca" | "tamanho" | "genero" | "pedidoMinimoCentavos">,
  nomeFornecedora?: string | null,
): string {
  const so = [
    c.marca && `da marca ${c.marca}`,
    c.tamanho && `tamanho ${c.tamanho}`,
    c.genero && (c.genero === "masculino" ? "de menino" : c.genero === "feminino" ? "de menina" : "unissex"),
    nomeFornecedora && `da fornecedora ${nomeFornecedora}`,
  ].filter(Boolean);
  return [
    descricaoDoDesconto(c),
    so.length > 0 && `em peças ${so.join(", ")}`,
    c.pedidoMinimoCentavos > 0 && `a partir de ${formatarReais(c.pedidoMinimoCentavos)}`,
  ]
    .filter(Boolean)
    .join(" ");
}

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const dataValida = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`));

export type DadosDoCupom = Omit<RegraDoCupom, "id">;

/** Lê o formulário do cupom. */
export function lerCupom(valores: Record<string, unknown>): { ok: true; dados: DadosDoCupom } | { ok: false; erro: string } {
  const codigo = lerCodigoDoCupom(valores.codigo);
  if (!codigo) return { ok: false, erro: "O código precisa ter de 3 a 30 letras ou números, sem espaços (ex.: BEMVINDA10)." };
  const tipo: TipoDesconto = valores.tipo === "reais" ? "reais" : "percentual";
  let valor: number | undefined;
  try {
    valor = tipo === "reais" ? lerReais(texto(valores.valor)) : lerPercentual(texto(valores.valor));
  } catch {
    valor = undefined;
  }
  if (!valor || valor <= 0) {
    return { ok: false, erro: tipo === "reais" ? "Escreva o desconto em reais, como 10 ou 7,50." : "Escreva o desconto em %, como 10." };
  }
  if (tipo === "percentual" && valor >= 10000) return { ok: false, erro: "O desconto precisa ser menor que 100%." };
  if (tipo === "reais" && valor > 10_000_000) return { ok: false, erro: "Confira o desconto: parece alto demais." };
  const inicio = texto(valores.inicio) || null;
  const fim = texto(valores.fim) || null;
  if (inicio && !dataValida(inicio)) return { ok: false, erro: "A data de início não é válida." };
  if (fim && !dataValida(fim)) return { ok: false, erro: "A data de fim não é válida." };
  if (inicio && fim && fim < inicio) return { ok: false, erro: "O cupom precisa terminar depois de começar." };
  const tLimite = texto(valores.limite);
  const limiteUsos = tLimite ? Number(tLimite) : null;
  if (limiteUsos !== null && (!Number.isInteger(limiteUsos) || limiteUsos < 1 || limiteUsos > 100_000)) {
    return { ok: false, erro: "O limite de usos precisa ser um número inteiro, como 1 ou 50 (ou vazio, sem limite)." };
  }
  let pedidoMinimoCentavos = 0;
  try {
    pedidoMinimoCentavos = lerReais(texto(valores.minimo));
  } catch {
    return { ok: false, erro: "Escreva o pedido mínimo em reais, como 50 (ou deixe vazio)." };
  }
  if (pedidoMinimoCentavos < 0) return { ok: false, erro: "O pedido mínimo não pode ser negativo." };
  const tDesde = texto(valores.cadastroDesde);
  const tAte = texto(valores.cadastroAte);
  const cadastroDesde = tDesde ? lerDataHoraSP(tDesde) : null;
  const cadastroAte = tAte ? lerDataHoraSP(tAte) : null;
  if (tDesde && !cadastroDesde) return { ok: false, erro: "Confira a data e a hora de início do cadastro." };
  if (tAte && !cadastroAte) return { ok: false, erro: "Confira a data e a hora de fim do cadastro." };
  if (cadastroDesde && cadastroAte && cadastroAte <= cadastroDesde) return { ok: false, erro: "O fim do cadastro precisa ser depois do início." };
  const tDias = texto(valores.diasParaUsar);
  const diasParaUsar = tDias ? Number(tDias) : null;
  if (diasParaUsar !== null && (!Number.isInteger(diasParaUsar) || diasParaUsar < 1 || diasParaUsar > 365)) {
    return { ok: false, erro: "O prazo para usar precisa ser um número de dias, como 7 (ou vazio, sem prazo)." };
  }
  const tamanho = TAMANHOS.find((t) => t.valor === valores.tamanho)?.valor ?? null;
  const genero = valores.genero === "masculino" || valores.genero === "feminino" || valores.genero === "unissex" ? valores.genero : null;
  const marca = texto(valores.marca).replace(/\s+/g, " ").slice(0, 80) || null;
  return {
    ok: true,
    dados: {
      codigo,
      tipo,
      valor,
      inicio,
      fim,
      limiteUsos,
      pedidoMinimoCentavos,
      porContaDaLoja: valores.quem === "loja",
      ativo: valores.ativo === undefined ? true : valores.ativo === "on" || valores.ativo === true,
      clienteId: texto(valores.clienteId) || null,
      marca,
      tamanho,
      genero,
      fornecedoraId: texto(valores.fornecedoraId) || null,
      soPrimeiraCompra: valores.soPrimeiraCompra === "on" || valores.soPrimeiraCompra === true,
      cadastroDesde,
      cadastroAte,
      diasParaUsar,
    },
  };
}

const reaisNoCampo = (centavos: number) => `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, "0")}`;

/**
 * Campos de desconto da confirmação do pagamento de um pedido do site, com a
 * promoção e o cupom que ele teve:
 * - cupom sem restrição: desconto no carrinho em R$ (a mesma divisão
 *   proporcional que o site fez), com quem paga o cupom;
 * - promoção, e cupom restrito a algumas peças: desconto por peça em R$. Se a
 *   peça teve os dois, vale quem paga a promoção.
 */
export function valoresDoPedido(
  itens: readonly {
    pecaId: string;
    promocao: { descontoCentavos: number; porContaDaLoja: boolean; nome: string } | null;
    descontoCupomCentavos: number;
  }[],
  cupom: { codigo: string; porContaDaLoja: boolean; restrito: boolean; descontoCentavos: number } | null,
): Record<string, string> {
  const valores: Record<string, string> = {};
  const motivos: string[] = [];
  const promocoes = new Set<string>();
  for (const i of itens) {
    const doCupom = cupom?.restrito ? i.descontoCupomCentavos : 0;
    const total = (i.promocao?.descontoCentavos ?? 0) + doCupom;
    if (total <= 0) continue;
    valores[`peca_desconto:${i.pecaId}`] = reaisNoCampo(total);
    valores[`peca_tipo:${i.pecaId}`] = "reais";
    const lojaPaga = i.promocao && i.promocao.descontoCentavos > 0 ? i.promocao.porContaDaLoja : Boolean(cupom?.porContaDaLoja);
    valores[`peca_quem:${i.pecaId}`] = lojaPaga ? "loja" : "dividido";
    if (i.promocao && i.promocao.descontoCentavos > 0) promocoes.add(i.promocao.nome);
  }
  if (promocoes.size > 0) motivos.push(`${promocoes.size === 1 ? "Promoção" : "Promoções"}: ${[...promocoes].join(", ")}`);
  if (cupom && cupom.descontoCentavos > 0) {
    if (!cupom.restrito) {
      valores.desconto_modo = "reais";
      valores.desconto = reaisNoCampo(cupom.descontoCentavos);
      valores.desconto_quem = cupom.porContaDaLoja ? "loja" : "dividido";
    }
    motivos.push(`Cupom ${cupom.codigo}`);
  }
  if (motivos.length > 0) valores.desconto_motivo = motivos.join(" · ").slice(0, 200);
  return valores;
}
