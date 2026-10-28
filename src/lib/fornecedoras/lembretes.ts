// Situação do convite de primeiro acesso e a lista de fornecedoras para lembrar.
// Funções puras, testadas.

import { VALIDADE_LINK_DIAS } from "../clientes/conta";
import { formatarDia } from "../datas";

/** Dias depois do link para a fornecedora entrar na lista "convites para lembrar". */
export const DIAS_PARA_LEMBRAR = 3;
const DIA = 24 * 60 * 60 * 1000;

export type EtapaDoCadastro = "dados" | "acordo" | "parabens" | "liberada";

export type SituacaoDoConvite =
  | { tipo: "sem-link" }
  | { tipo: "aguardando"; geradoEm: Date; expiraEm: Date }
  | { tipo: "vencido"; geradoEm: Date; expiraEm: Date }
  | { tipo: "comecou"; etapa: "dados" | "acordo" }
  | { tipo: "concluido" };

/**
 * Onde a fornecedora está no primeiro acesso. `ultimoConvite` é o convite mais
 * novo dela (um convite novo cancela os anteriores, então só ele conta).
 */
export function situacaoDoConvite(
  f: { temConta: boolean; etapa: EtapaDoCadastro },
  ultimoConvite: { criadoEm: Date; expiraEm: Date } | null,
  agora: Date,
): SituacaoDoConvite {
  if (f.temConta) return f.etapa === "dados" || f.etapa === "acordo" ? { tipo: "comecou", etapa: f.etapa } : { tipo: "concluido" };
  if (!ultimoConvite) return { tipo: "sem-link" };
  const { criadoEm: geradoEm, expiraEm } = ultimoConvite;
  return expiraEm <= agora ? { tipo: "vencido", geradoEm, expiraEm } : { tipo: "aguardando", geradoEm, expiraEm };
}

/** Frase da situação, para a página da fornecedora no painel. */
export function textoDaSituacao(s: SituacaoDoConvite): string {
  switch (s.tipo) {
    case "sem-link":
      return "Ainda não recebeu o link de primeiro acesso.";
    case "aguardando":
      return `Link gerado em ${formatarDia(s.geradoEm)}. Ainda não entrou (o link vale até ${formatarDia(s.expiraEm)}).`;
    case "vencido":
      return `O link gerado em ${formatarDia(s.geradoEm)} venceu em ${formatarDia(s.expiraEm)} sem ser usado. Gere um link novo.`;
    case "comecou":
      return s.etapa === "dados" ? "Entrou, mas ainda não terminou o cadastro." : "Entrou, mas ainda não aceitou o contrato.";
    case "concluido":
      return "Cadastro concluído.";
  }
}

/**
 * Precisa de lembrete? Quem recebeu o link há DIAS_PARA_LEMBRAR dias ou mais e
 * não entrou, ou quem entrou e parou no meio do cadastro. Quem nunca recebeu
 * link não entra na lista (a loja ainda não convidou).
 */
export function precisaDeLembrete(s: SituacaoDoConvite, agora: Date): boolean {
  if (s.tipo === "comecou") return true;
  if (s.tipo === "aguardando" || s.tipo === "vencido") return agora.getTime() - s.geradoEm.getTime() >= DIAS_PARA_LEMBRAR * DIA;
  return false;
}

/** Mensagem curta de lembrete, com o link novo (para quem não entrou) ou o endereço de entrar. */
export function mensagemDeLembrete(
  nome: string,
  s: SituacaoDoConvite,
  link: string,
  nomeLoja = "Salty Baby",
  linkDoVideo?: string,
): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  const oi = `Oi${primeiro ? `, ${primeiro}` : ""}! Aqui é da ${nomeLoja} 💛`;
  const video = linkDoVideo ? `\n\nVídeo de 1 minuto mostrando como colocar a loja na tela inicial do celular:\n${linkDoVideo}` : "";
  if (s.tipo === "comecou") {
    const falta = s.etapa === "dados" ? "terminar o seu cadastro" : "ler e aceitar o acordo de consignação";
    return `${oi}\n\nFalta pouco para liberar a sua área de fornecedora: só ${falta}. Entre com o seu e-mail e a sua senha:\n${link}${video}\n\nQualquer dúvida, é só responder aqui 🐳`;
  }
  return `${oi}\n\nPassando para lembrar da sua *área de fornecedora* no nosso site: lá você acompanha suas peças, suas vendas e quanto tem a receber.\n\nLeva uns 3 minutos. Seu link novo (vale por ${VALIDADE_LINK_DIAS} dias):\n${link}${video}\n\nQualquer dúvida, é só responder aqui 🐳`;
}
