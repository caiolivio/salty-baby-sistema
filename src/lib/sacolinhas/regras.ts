// Sacolinha (CLAUDE.md, "Sacolinha"): peças já pagas que ficam guardadas na
// loja até a cliente pedir o envio. Funções puras, testadas.

import { devolucaoDisponivelEm } from "../fornecedoras/saldos";
import { formatarData } from "../datas";

/** Prazo padrão, contado da primeira peça (a loja configura). */
export const MESES_SACOLINHA = 3;
/** A cliente recebe um aviso por semana. */
export const DIAS_ENTRE_AVISOS = 7;

export const SITUACOES_SACOLINHA = {
  aberta: "Aberta",
  envio_pedido: "Envio pedido",
  enviada: "Enviada",
  retirada: "Retirada na loja",
  doada: "Doada",
} as const;
export type SituacaoSacolinha = keyof typeof SITUACOES_SACOLINHA;

/** Como a sacolinha é fechada no painel; cada um vira o status das peças. */
export const FECHAMENTOS = ["enviada", "retirada", "doada"] as const;
export type Fechamento = (typeof FECHAMENTOS)[number];

const DIA = 86_400_000;
const dataDoDia = (aaaammdd: string) => new Date(`${aaaammdd}T00:00:00Z`);

/** Último dia (aaaa-mm-dd) para pedir o envio: a data da primeira peça mais os meses do prazo. */
export function prazoDaSacolinha(inicio: string, meses = MESES_SACOLINHA): string {
  return devolucaoDisponivelEm(dataDoDia(inicio), meses);
}

export type SituacaoDoPrazo =
  | { tipo: "no-prazo"; dias: number }
  | { tipo: "vence-hoje" }
  | { tipo: "vencida"; dias: number };

/** Quanto falta (ou quanto passou) do prazo, contando em dias a partir de hoje (aaaa-mm-dd). */
export function situacaoDoPrazo(prazo: Date, hoje: string): SituacaoDoPrazo {
  const dias = Math.round((prazo.getTime() - dataDoDia(hoje).getTime()) / DIA);
  if (dias > 0) return { tipo: "no-prazo", dias };
  if (dias === 0) return { tipo: "vence-hoje" };
  return { tipo: "vencida", dias: -dias };
}

const dias = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

/** "Faltam 12 dias (até 05/01/2027)", "Vence hoje (05/01/2027)" ou "Venceu em 05/01/2027". */
export function textoDoPrazo(prazo: Date, hoje: string): string {
  const s = situacaoDoPrazo(prazo, hoje);
  const data = formatarData(prazo);
  if (s.tipo === "no-prazo") return `${s.dias === 1 ? "Falta" : "Faltam"} ${dias(s.dias)} (até ${data})`;
  if (s.tipo === "vence-hoje") return `Vence hoje (${data})`;
  return `Venceu em ${data}`;
}

/** O aviso que aparece na compra, na página da sacolinha e nos lembretes. */
export function avisoDeDoacao(prazo: Date, nomeCurto: string): string {
  return `Se o envio não for pedido até ${formatarData(prazo)}, as peças da sacolinha serão doadas pela ${nomeCurto}.`;
}

/** Está na hora do aviso semanal? Conta a partir do último aviso ou, sem aviso, da abertura. */
export function precisaDeAviso(sacolinha: { abertaEm: Date; ultimoAvisoEm: Date | null }, agora: Date): boolean {
  const desde = sacolinha.ultimoAvisoEm ?? sacolinha.abertaEm;
  return agora.getTime() - desde.getTime() >= DIAS_ENTRE_AVISOS * DIA;
}

/** Vencida e ainda aberta: vai para a lista "a doar", que a loja confirma. */
export function estaParaDoar(sacolinha: { situacao: string; prazo: Date }, hoje: string): boolean {
  return sacolinha.situacao === "aberta" && situacaoDoPrazo(sacolinha.prazo, hoje).tipo === "vencida";
}

/** Data nova do prazo, escolhida no painel (aaaa-mm-dd, entre hoje e 2 anos). */
export function lerPrazo(valor: unknown, hoje: string): { ok: true; prazo: string } | { ok: false; erro: string } {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(dataDoDia(texto).getTime())) {
    return { ok: false, erro: "Escolha a data do novo prazo." };
  }
  if (texto < hoje) return { ok: false, erro: "O prazo não pode ficar no passado." };
  if (texto > prazoDaSacolinha(hoje, 24)) return { ok: false, erro: "O prazo pode ir até 2 anos a partir de hoje." };
  return { ok: true, prazo: texto };
}

export type PecaDaSacolinha = { codigo: string; nome: string; tamanho: string | null };

const linhaDaPeca = (p: PecaDaSacolinha) => `• ${[p.codigo, p.nome, p.tamanho && `tam. ${p.tamanho}`].filter(Boolean).join(" · ")}`;

/** Aviso semanal pelo WhatsApp: o que está na sacolinha, quanto falta, novidades e o atalho para pedir o envio. */
export function mensagemDoAviso(dados: {
  nomeCliente: string;
  nomeCurto: string;
  pecas: PecaDaSacolinha[];
  prazo: Date;
  hoje: string;
  /** Peças novas no tamanho dela na última semana, com o link da vitrine. */
  novidades: { quantidade: number; tamanho: string; link: string } | null;
  linkSacolinha: string;
}): string {
  const primeiroNome = dados.nomeCliente.trim().split(/\s+/)[0];
  const situacao = situacaoDoPrazo(dados.prazo, dados.hoje);
  const prazo =
    situacao.tipo === "no-prazo"
      ? `Faltam ${dias(situacao.dias)} para pedir o envio (até ${formatarData(dados.prazo)}).`
      : situacao.tipo === "vence-hoje"
        ? `Hoje (${formatarData(dados.prazo)}) é o último dia para pedir o envio.`
        : `O prazo para pedir o envio venceu em ${formatarData(dados.prazo)}.`;
  const novidades = dados.novidades && dados.novidades.quantidade > 0
    ? [
        "",
        `Chegaram ${dados.novidades.quantidade === 1 ? "1 peça nova" : `${dados.novidades.quantidade} peças novas`} no tamanho ${dados.novidades.tamanho} esta semana:`,
        dados.novidades.link,
      ]
    : [];
  return [
    `Oi, ${primeiroNome}! Aqui é da ${dados.nomeCurto}. Sua sacolinha está guardada com a gente:`,
    "",
    ...dados.pecas.map(linhaDaPeca),
    "",
    prazo,
    avisoDeDoacao(dados.prazo, dados.nomeCurto),
    ...novidades,
    "",
    `Para pedir o envio (o frete é por sua conta), é só tocar aqui: ${dados.linkSacolinha}`,
  ].join("\n");
}

/** Mensagem que a cliente manda para a loja ao pedir o envio da sacolinha. */
export function mensagemPedirEnvio(dados: { nomeCliente: string; pecas: PecaDaSacolinha[]; endereco: string | null }): string {
  return [
    `Olá! Sou ${dados.nomeCliente} e quero pedir o envio da minha sacolinha:`,
    "",
    ...dados.pecas.map(linhaDaPeca),
    "",
    dados.endereco ? `Endereço: ${dados.endereco}` : "Vou mandar o endereço de entrega.",
    "Qual é o valor do frete?",
  ].join("\n");
}

/** Endereço de entrega da ficha, numa linha só (vazio se não houver rua). */
export function enderecoDeEntrega(c: { endereco: string | null; cidade: string | null; estado: string | null; cep: string | null }): string | null {
  if (!c.endereco?.trim()) return null;
  const cidade = [c.cidade, c.estado].filter(Boolean).join("-");
  return [c.endereco.trim(), cidade, c.cep && `CEP ${c.cep}`].filter(Boolean).join(", ");
}

/** O tamanho que mais aparece nas peças da sacolinha (para as novidades do aviso). */
export function tamanhoMaisComum(pecas: { tamanho: string | null }[]): string | null {
  const contagem = new Map<string, number>();
  for (const p of pecas) if (p.tamanho) contagem.set(p.tamanho, (contagem.get(p.tamanho) ?? 0) + 1);
  let melhor: string | null = null;
  for (const [tamanho, n] of contagem) if (melhor === null || n > (contagem.get(melhor) ?? 0)) melhor = tamanho;
  return melhor;
}

/** "O que é a sacolinha?": aparece no "Fechar pedido" e na página da sacolinha da cliente. */
export function explicacaoDaSacolinha(nomeCurto: string, meses = MESES_SACOLINHA): string[] {
  return [
    `Você paga o pedido normalmente, e as peças ficam guardadas na ${nomeCurto} até você pedir o envio.`,
    "Pode ir juntando vários pedidos, em dias diferentes, na mesma sacolinha. No fim, você paga um frete só.",
    `O prazo é de ${meses} meses a partir da primeira peça. Se o envio não for pedido até lá, as peças são doadas.`,
    'Quando quiser receber, toque em "Pedir envio" em Minha conta > Sacolinha ou fale com a gente no WhatsApp.',
  ];
}
