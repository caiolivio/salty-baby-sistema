// "Enviar hoje": o que a loja precisa mandar ou fazer no dia, os lembretes da
// rotina, o alerta do backup e as mensagens novas (peça vendida, pedido não
// pago, cliente sumida e aniversário da criança). Funções puras, testadas.
// Datas sem hora no formato aaaa-mm-dd, valores em centavos.

import { DIAS_CONSOLIDACAO, nomeDoMes } from "../acertos/regras";
import { formatarReais } from "../dinheiro";

const DIA = 24 * 60 * 60 * 1000;

/** Tipos de mensagem da lista "Enviar hoje" guardados em `mensagens_enviadas`. */
export const TIPOS_DE_MENSAGEM = ["peca_vendida", "pedido_nao_pago", "cliente_sumida", "aniversario"] as const;
export type TipoDeMensagem = (typeof TIPOS_DE_MENSAGEM)[number];

/** Cliente sem compra há 60 dias (e há menos de um ano) entra na lista de sumidas. */
export const DIAS_SUMIDA = 60;
export const DIAS_SUMIDA_MAXIMO = 365;
/** Pedido não pago aparece por 3 dias depois de vencer a reserva. */
export const DIAS_PEDIDO_NAO_PAGO = 3;
/** Venda aparece por 14 dias para avisar a fornecedora. */
export const DIAS_PECA_VENDIDA = 14;
/** Aviso do aniversário da criança: na semana antes. */
export const DIAS_ANIVERSARIO = 7;

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";
const oi = (nome: string, loja: string) => `Oi${primeiroNome(nome) ? `, ${primeiroNome(nome)}` : ""}! Aqui é da ${loja} 💛`;

/** Dia da semana de uma data aaaa-mm-dd (0 = domingo). */
function diaDaSemana(dia: string): number {
  return new Date(`${dia}T12:00:00Z`).getUTCDay();
}

export type Lembrete = { chave: string; titulo: string; texto: string; href: string };

/**
 * Lembretes da rotina: toda segunda, postar os lançamentos da semana; na
 * primeira semana do mês, acertar com as fornecedoras e mandar os relatórios
 * (enquanto houver o que pagar ou enviar).
 */
export function lembretesDaLoja(d: { hoje: string; acertosAPagar: number; relatoriosAEnviar: number; mesPassado: string }): Lembrete[] {
  const lista: Lembrete[] = [];
  if (diaDaSemana(d.hoje) === 1) {
    lista.push({
      chave: "lancamentos",
      titulo: "Postar os lançamentos da semana",
      texto: "Segunda-feira: um post por grupo com as peças que entraram no site nos últimos 7 dias.",
      href: "/painel/marketing/resumo",
    });
  }
  const dia = Number(d.hoje.slice(8, 10));
  if (dia <= 7 && d.acertosAPagar > 0) {
    lista.push({
      chave: "acerto",
      titulo: "Fazer o acerto com as fornecedoras",
      texto: `${d.acertosAPagar === 1 ? "1 fornecedora tem" : `${d.acertosAPagar} fornecedoras têm`} repasse para receber neste acerto.`,
      href: "/painel/acertos",
    });
  }
  if (dia <= 7 && d.relatoriosAEnviar > 0) {
    lista.push({
      chave: "relatorios",
      titulo: "Enviar os relatórios do mês",
      texto: `${d.relatoriosAEnviar === 1 ? "1 relatório" : `${d.relatoriosAEnviar} relatórios`} de ${nomeDoMes(`${d.mesPassado}-01`)} ainda não ${d.relatoriosAEnviar === 1 ? "foi enviado" : "foram enviados"}.`,
      href: `/painel/relatorios?mes=${d.mesPassado}`,
    });
  }
  return lista;
}

export type UltimoBackup = { situacao: "rodando" | "ok" | "erro"; iniciadoEm: Date; noDrive: boolean; mensagem: string | null } | null;
export type AlertaDoBackup = { tipo: "erro" | "atrasado" | "sem-drive"; texto: string } | null;

/**
 * Alerta do backup: a última cópia falhou, não roda há mais de 30 horas (a do
 * dia não aconteceu) ou o Google Drive não está ligado (a cópia fica só na VPS).
 */
export function alertaDoBackup(ultimo: UltimoBackup, driveLigado: boolean, agora: Date): AlertaDoBackup {
  if (!ultimo) return { tipo: "atrasado", texto: "Ainda não foi feita nenhuma cópia de segurança." };
  const horas = (agora.getTime() - ultimo.iniciadoEm.getTime()) / 3_600_000;
  if (ultimo.situacao === "erro") return { tipo: "erro", texto: `A última cópia de segurança deu erro${ultimo.mensagem ? `: ${ultimo.mensagem}` : "."}` };
  if (horas > 30) return { tipo: "atrasado", texto: `A cópia de segurança não roda há ${Math.floor(horas / 24) || 1} dia(s).` };
  if (!driveLigado) return { tipo: "sem-drive", texto: "O Google Drive não está ligado: as cópias ficam só no servidor." };
  if (ultimo.situacao === "ok" && !ultimo.noDrive) return { tipo: "sem-drive", texto: "A última cópia não chegou ao Google Drive. Confira a ligação." };
  return null;
}

/**
 * Mês (aaaa-mm) do acerto que paga uma venda: o do dia 1 seguinte, se a venda
 * foi até 10 dias antes do fim do mês; senão o do mês depois (contrato 9.2 e 10.3).
 */
export function mesDoAcerto(dataVenda: string): string {
  const [ano, mes, dia] = dataVenda.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const pula = dia <= ultimoDia - DIAS_CONSOLIDACAO ? 1 : 2;
  return new Date(Date.UTC(ano, mes - 1 + pula, 1)).toISOString().slice(0, 7);
}

export type PecaVendida = { codigo: string; nome: string; repasseCentavos: number };

/** "Sua peça vendeu!": o que vendeu, quanto ela recebe e em que acerto. */
export function mensagemPecaVendida(d: {
  nomeFornecedora: string;
  nomeLoja: string;
  pecas: PecaVendida[];
  dataVenda: string;
  linkArea: string;
}): string {
  const total = d.pecas.reduce((s, p) => s + p.repasseCentavos, 0);
  const uma = d.pecas.length === 1;
  return [
    oi(d.nomeFornecedora, d.nomeLoja),
    uma ? "Boa notícia: *uma peça sua foi vendida!* 🎉" : `Boa notícia: *${d.pecas.length} peças suas foram vendidas!* 🎉`,
    d.pecas.map((p) => `• ${p.nome} (${p.codigo}): ${formatarReais(p.repasseCentavos)} para você`).join("\n"),
    `${uma ? "Esse valor entra" : `O total de ${formatarReais(total)} entra`} no acerto do início de ${nomeDoMes(`${mesDoAcerto(d.dataVenda)}-01`)}.`,
    `Acompanhe suas vendas na sua área: ${d.linkArea}`,
  ].join("\n\n");
}

export type PecaDoPedido = { nome: string; tamanho: string | null; precoCentavos: number; link: string };

/** Pedido que venceu sem pagamento: as peças que ainda estão à venda, para ela fechar de novo. */
export function mensagemPedidoNaoPago(d: { nomeCliente: string; nomeLoja: string; numero: number; pecas: PecaDoPedido[] }): string {
  return [
    oi(d.nomeCliente, d.nomeLoja),
    `Vi que o seu pedido nº ${d.numero} não foi concluído e a reserva acabou. ${d.pecas.length === 1 ? "A peça ainda está disponível" : "Estas peças ainda estão disponíveis"}:`,
    d.pecas.map((p) => `• ${p.nome}${p.tamanho ? ` (tam. ${p.tamanho})` : ""}: ${formatarReais(p.precoCentavos)}\n${p.link}`).join("\n"),
    "Ainda quer? É só fechar o pedido de novo no site ou responder aqui que a gente ajuda 🐳",
  ].join("\n\n");
}

/** Cliente sem compra entre 60 dias e um ano. */
export function estaSumida(ultimaCompra: Date, agora: Date): boolean {
  const dias = (agora.getTime() - ultimaCompra.getTime()) / DIA;
  return dias >= DIAS_SUMIDA && dias <= DIAS_SUMIDA_MAXIMO;
}

/** Saudade: novidades no tamanho das crianças dela desde a última compra. */
export function mensagemClienteSumida(d: {
  nomeCliente: string;
  nomeLoja: string;
  novidades: { tamanho: string; quantidade: number; link: string }[];
  linkLoja: string;
}): string {
  const com = d.novidades.filter((n) => n.quantidade > 0);
  return [
    oi(d.nomeCliente, d.nomeLoja),
    com.length
      ? "Faz um tempinho que você não passa por aqui, e chegou coisa nova no tamanho das suas crianças!"
      : "Faz um tempinho que você não passa por aqui! Toda semana chegam peças novas na loja.",
    ...(com.length
      ? [com.map((n) => `• ${n.quantidade === 1 ? "1 peça nova" : `${n.quantidade} peças novas`} no tamanho ${n.tamanho}:\n${n.link}`).join("\n")]
      : [`Dá uma olhada nas novidades: ${d.linkLoja}`]),
    "Se quiser, é só responder aqui que a gente separa para você 🐳",
  ].join("\n\n");
}

/** Próximo aniversário (nos próximos 7 dias, contando hoje): o dia e a idade que a criança faz. */
export function aniversarioProximo(nascimento: Date, hoje: string, dias = DIAS_ANIVERSARIO): { dia: string; anos: number } | null {
  const ano = Number(hoje.slice(0, 4));
  const base = new Date(`${hoje}T00:00:00Z`).getTime();
  for (const a of [ano, ano + 1]) {
    const mesDia = nascimento.toISOString().slice(5, 10);
    // 29/02 em ano que não é bissexto vira 28/02.
    const data = new Date(`${a}-${mesDia}T00:00:00Z`);
    const dia = Number.isNaN(data.getTime()) || data.toISOString().slice(5, 10) !== mesDia ? `${a}-02-28` : `${a}-${mesDia}`;
    const distancia = (new Date(`${dia}T00:00:00Z`).getTime() - base) / DIA;
    if (distancia >= 0 && distancia < dias) {
      const anos = a - nascimento.getUTCFullYear();
      return anos >= 1 ? { dia, anos } : null;
    }
  }
  return null;
}

/** Aniversário da criança: parabéns e as peças no tamanho novo. */
export function mensagemAniversario(d: {
  nomeCliente: string;
  nomeLoja: string;
  nomeCrianca: string | null;
  anos: number;
  dia: string;
  tamanho: string | null;
  quantidade: number;
  link: string;
}): string {
  const quem = d.nomeCrianca?.trim() ? `${primeiroNome(d.nomeCrianca)}` : "sua criança";
  const data = `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`;
  return [
    oi(d.nomeCliente, d.nomeLoja),
    `${quem.charAt(0).toUpperCase()}${quem.slice(1)} faz ${d.anos === 1 ? "1 aninho" : `${d.anos} anos`} no dia ${data}! 🎂 Parabéns!`,
    d.tamanho && d.quantidade > 0
      ? `Separamos as novidades no tamanho ${d.tamanho}, para a nova fase (${d.quantidade === 1 ? "1 peça" : `${d.quantidade} peças`}):\n${d.link}`
      : `Dá uma olhada nas novidades da loja:\n${d.link}`,
    "Qualquer dúvida, é só responder aqui 🐳",
  ].join("\n\n");
}
