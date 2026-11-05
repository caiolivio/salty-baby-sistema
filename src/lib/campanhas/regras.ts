// Campanhas de lançamento (ex.: "Lançamento RN"): página /c/<código> com as
// peças dos tamanhos escolhidos (inclusive as "Não listado", que só quem tem o
// link vê), faixa no alto do site com contagem regressiva e o lembrete de quem
// se cadastrou e ainda não usou o cupom de boas-vindas. Funções puras, testadas.

import { dataHoraSP, lerDataHoraSP } from "../cupons/regras";
import { lerTamanho, ordemDoTamanho, type Tamanho } from "../tamanhos";

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** O lembrete do cupom aparece no "Enviar hoje" quando faltam 3 dias ou menos para ele vencer. */
export const DIAS_LEMBRETE_CUPOM = 3;

export type DadosDaCampanha = {
  nome: string;
  codigo: string;
  titulo: string;
  texto: string | null;
  tamanhos: Tamanho[];
  faixa: string | null;
  /** ISO, ou null sem contagem regressiva. */
  ate: string | null;
  cupom: string | null;
  ativa: boolean;
};

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const linha = (v: unknown) => texto(v).replace(/\s+/g, " ");

/** "Lançamento RN!" → "lancamento-rn". */
export function codigoDaCampanha(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** Tamanhos guardados como texto ("Prematuro,RN"), na ordem oficial e sem repetir. */
export function tamanhosDaCampanha(guardado: string | readonly string[]): Tamanho[] {
  const lista = typeof guardado === "string" ? guardado.split(",") : guardado;
  const lidos = new Set<Tamanho>();
  for (const t of lista) {
    const tamanho = lerTamanho(t);
    if (tamanho) lidos.add(tamanho);
  }
  return [...lidos].sort((a, b) => ordemDoTamanho(a) - ordemDoTamanho(b));
}

/** Formulário do painel (/painel/campanhas). */
export function lerCampanha(valores: Record<string, unknown>, tamanhosMarcados: readonly string[]): { ok: true; dados: DadosDaCampanha } | { ok: false; erro: string } {
  const nome = linha(valores.nome);
  if (nome.length < 2) return { ok: false, erro: "Dê um nome para a campanha, como Lançamento RN." };
  if (nome.length > 80) return { ok: false, erro: "Use no máximo 80 caracteres no nome." };
  const codigo = codigoDaCampanha(texto(valores.codigo) || nome);
  if (codigo.length < 2) return { ok: false, erro: "O endereço precisa ter letras ou números, como lancamento-rn." };
  const titulo = linha(valores.titulo) || nome;
  if (titulo.length > 120) return { ok: false, erro: "Use no máximo 120 caracteres no título." };
  const corpo = texto(valores.texto);
  if (corpo.length > 2000) return { ok: false, erro: "Use no máximo 2.000 caracteres no texto." };
  const tamanhos = tamanhosDaCampanha(tamanhosMarcados);
  if (tamanhos.length === 0) return { ok: false, erro: "Marque pelo menos um tamanho para a página da campanha." };
  const faixa = linha(valores.faixa);
  if (faixa.length > 160) return { ok: false, erro: "Use no máximo 160 caracteres na faixa." };
  const textoAte = texto(valores.ate);
  const ate = textoAte ? lerDataHoraSP(textoAte) : null;
  if (textoAte && !ate) return { ok: false, erro: "Confira a data e a hora do fim da contagem." };
  const cupom = texto(valores.cupom).toUpperCase().replace(/\s+/g, "");
  if (cupom && !/^[A-Z0-9_-]{3,30}$/.test(cupom)) return { ok: false, erro: "Confira o código do cupom." };
  return {
    ok: true,
    dados: {
      nome,
      codigo,
      titulo,
      texto: corpo || null,
      tamanhos,
      faixa: faixa || null,
      ate,
      cupom: cupom || null,
      ativa: valores.ativa === "on" || valores.ativa === "sim",
    },
  };
}

/** A faixa aparece com a campanha ativa, com frase e antes do fim da contagem. */
export function faixaNoAr(c: { ativa: boolean; faixa: string | null; ate: Date | null }, agora: Date): boolean {
  return c.ativa && Boolean(c.faixa) && (!c.ate || c.ate.getTime() > agora.getTime());
}

/** Tempo que falta, curto: "2 dias e 5 h", "5 h e 12 min", "12 min", ou null quando acabou. */
export function tempoQueFalta(ate: Date, agora: Date): string | null {
  const falta = ate.getTime() - agora.getTime();
  if (falta <= 0) return null;
  const dias = Math.floor(falta / DIA);
  const horas = Math.floor((falta % DIA) / HORA);
  const minutos = Math.floor((falta % HORA) / MINUTO);
  if (dias > 0) return horas > 0 ? `${dias} ${dias === 1 ? "dia" : "dias"} e ${horas} h` : `${dias} ${dias === 1 ? "dia" : "dias"}`;
  if (horas > 0) return minutos > 0 ? `${horas} h e ${minutos} min` : `${horas} h`;
  return minutos > 0 ? `${minutos} min` : "menos de 1 min";
}

/** Relógio da contagem: dias, horas, minutos e segundos que faltam (zeros quando acabou). */
export function relogio(ate: Date, agora: Date): { dias: number; horas: number; minutos: number; segundos: number } {
  const falta = Math.max(0, ate.getTime() - agora.getTime());
  return {
    dias: Math.floor(falta / DIA),
    horas: Math.floor((falta % DIA) / HORA),
    minutos: Math.floor((falta % HORA) / MINUTO),
    segundos: Math.floor((falta % MINUTO) / 1000),
  };
}

/** Endereço da página da campanha, com a marca do grupo de WhatsApp de origem. */
export function linkDaCampanha(origem: string, codigo: string, grupo?: string | null): string {
  return `${origem.replace(/\/+$/, "")}/c/${codigo}${grupo ? `?g=${encodeURIComponent(grupo)}` : ""}`;
}

/** O lembrete do cupom sai quando ele vence nos próximos 3 dias. */
export function lembrarDoCupom(vence: Date, agora: Date, dias = DIAS_LEMBRETE_CUPOM): boolean {
  const falta = vence.getTime() - agora.getTime();
  return falta > 0 && falta <= dias * DIA;
}

/** Quando o cupom de boas-vindas vence para a cliente: o prazo contado do cadastro ou o fim do cupom, o que vier antes. */
export function venceEm(prazoDoCadastro: Date | null, fimDoCupom: string | null): Date | null {
  // O fim do cupom é um dia (aaaa-mm-dd) e vale até o fim dele, na hora de Brasília.
  const fim = fimDoCupom ? new Date(`${fimDoCupom}T23:59:59-03:00`) : null;
  if (prazoDoCadastro && fim) return prazoDoCadastro.getTime() < fim.getTime() ? prazoDoCadastro : fim;
  return prazoDoCadastro ?? fim;
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";

/** Lembrete para quem se cadastrou e ainda não usou o desconto de boas-vindas. */
export function mensagemDoCupomSemUso(d: {
  nomeCliente: string;
  nomeLoja: string;
  codigo: string;
  desconto: string;
  vence: Date;
  link: string;
}): string {
  const nome = primeiroNome(d.nomeCliente);
  return [
    `Oi${nome ? `, ${nome}` : ""}! Aqui é da ${d.nomeLoja} 💛`,
    `Passando para lembrar: o seu desconto de boas-vindas (${d.desconto}) vale até ${dataHoraSP(d.vence.toISOString())}.`,
    `É só usar o cupom *${d.codigo}* no carrinho, entrando na sua conta:\n${d.link}`,
    "Peça de brechó é única, quem fecha o pedido primeiro leva 🐳",
    "Se não quiser mais receber nossas mensagens, é só responder SAIR.",
  ].join("\n\n");
}
