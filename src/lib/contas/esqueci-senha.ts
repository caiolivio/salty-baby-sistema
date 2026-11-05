// "Esqueci a senha" (pedido do Caio, 05/11/2026): a pessoa digita o e-mail e
// recebe um link de criar senha que vale 1 hora. O e-mail sai pelo SMTP da
// própria loja (variáveis SMTP_*), sem serviço pago. Funções puras, testadas.

import { normalizarEmail } from "../senha";

/** Quanto tempo vale o link pedido pelo "Esqueci a senha". */
export const MINUTOS_DO_LINK = 60;

/** Um pedido novo para a mesma conta só sai depois deste intervalo. */
export const MINUTOS_ENTRE_PEDIDOS = 2;

export const fimDoLinkPorEmail = (agora: Date) => new Date(agora.getTime() + MINUTOS_DO_LINK * 60_000);

/** E-mail digitado, ou null se não parece um e-mail. */
export function lerEmailDoPedido(valor: unknown): string | null {
  const email = typeof valor === "string" ? normalizarEmail(valor) : "";
  return email.length <= 191 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export type ConfiguracaoSmtp = {
  host: string;
  porta: number;
  seguro: boolean;
  usuario: string;
  senha: string;
  remetente: string;
};

/** Configuração do envio, das variáveis de ambiente; null se falta alguma. */
export function smtpDoAmbiente(env: Record<string, string | undefined>): ConfiguracaoSmtp | null {
  const host = env.SMTP_HOST?.trim();
  const usuario = env.SMTP_USUARIO?.trim();
  const senha = env.SMTP_SENHA;
  if (!host || !usuario || !senha) return null;
  const porta = Number(env.SMTP_PORTA?.trim() || 465);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) return null;
  return { host, porta, seguro: porta === 465, usuario, senha, remetente: env.EMAIL_REMETENTE?.trim() || usuario };
}

const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** O e-mail com o link de nova senha. */
export function emailDeNovaSenha(dados: { nome: string; link: string; loja: string; cor?: string }) {
  const primeiro = dados.nome.trim().split(/\s+/)[0] || "";
  const ola = primeiro ? `Olá, ${primeiro}!` : "Olá!";
  const assunto = `${dados.loja}: link para criar uma nova senha`;
  const texto = [
    ola,
    "",
    `Recebemos um pedido para criar uma nova senha na sua conta do site da ${dados.loja}.`,
    `Para escolher a nova senha, abra este link (ele vale por ${MINUTOS_DO_LINK} minutos e funciona uma vez só):`,
    "",
    dados.link,
    "",
    "Se não foi você que pediu, pode ignorar este e-mail: a sua senha continua a mesma.",
  ].join("\n");
  const cor = /^#[0-9a-fA-F]{6}$/.test(dados.cor ?? "") ? dados.cor : "#13506E";
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f4f7f8;font-family:Arial,sans-serif;color:#13212B">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px">
<p style="font-size:16px;margin:0 0 12px">${escapar(ola)}</p>
<p style="font-size:15px;line-height:1.5;margin:0 0 20px">Recebemos um pedido para criar uma nova senha na sua conta do site da ${escapar(dados.loja)}.</p>
<p style="margin:0 0 20px"><a href="${escapar(dados.link)}" style="display:inline-block;background:${cor};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">Criar nova senha</a></p>
<p style="font-size:13px;line-height:1.5;color:#4d5f69;margin:0 0 12px">O link vale por ${MINUTOS_DO_LINK} minutos e funciona uma vez só. Se o botão não abrir, copie este endereço: ${escapar(dados.link)}</p>
<p style="font-size:13px;line-height:1.5;color:#4d5f69;margin:0">Se não foi você que pediu, pode ignorar este e-mail: a sua senha continua a mesma.</p>
</div></body></html>`;
  return { assunto, texto, html };
}
