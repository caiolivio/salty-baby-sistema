// "Indique uma amiga": cada cliente tem um link de cadastro com o código dela.
// A amiga que cria a conta por ele fica ligada a quem indicou; quando ela faz a
// primeira compra, a loja vê no "Enviar hoje" a mensagem do mimo para quem
// indicou. Funções puras, testadas.

import { randomInt } from "node:crypto";

/** Sem letras e números que se confundem (0/O, 1/I/L). */
const LETRAS = "abcdefghjkmnpqrstuvwxyz23456789";
const TAMANHO = 7;

/** Texto padrão do mimo, quando a loja não escreveu outro em Configurações. */
export const MIMO_PADRAO = "frete grátis no próximo envio";

export function gerarCodigoDeIndicacao(): string {
  let codigo = "";
  for (let i = 0; i < TAMANHO; i++) codigo += LETRAS[randomInt(LETRAS.length)];
  return codigo;
}

/** Código vindo do endereço (?indicacao=...), ou null se não parece um código. */
export function lerCodigoDeIndicacao(valor: unknown): string | null {
  const t = typeof valor === "string" ? valor.trim().toLowerCase() : "";
  return /^[a-z0-9]{5,12}$/.test(t) ? t : null;
}

export function linkDeIndicacao(origem: string, codigo: string): string {
  return `${origem.replace(/\/+$/, "")}/cadastro?indicacao=${codigo}`;
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";

/** Mensagem que a cliente manda para a amiga (botão "Indicar no WhatsApp"). */
export function mensagemParaIndicar(d: { nomeLoja: string; link: string; cupom?: string | null }): string {
  return [
    `Oi! Estou comprando no brechó infantil da ${d.nomeLoja} e lembrei de você 💛`,
    "As peças são escolhidas uma a uma e cada uma é única.",
    `Faça o seu cadastro por este link:\n${d.link}`,
    d.cupom ? `E use o cupom *${d.cupom}* na primeira compra 🐳` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Mensagem da loja para quem indicou, quando a amiga faz a primeira compra. */
export function mensagemDoMimo(d: { nomeCliente: string; nomeAmiga: string; nomeLoja: string; mimo: string | null }): string {
  const nome = primeiroNome(d.nomeCliente);
  const mimo = d.mimo?.trim() || MIMO_PADRAO;
  return [
    `Oi${nome ? `, ${nome}` : ""}! Aqui é da ${d.nomeLoja} 💛`,
    `A ${primeiroNome(d.nomeAmiga) || "sua amiga"} se cadastrou pelo seu link e fez a primeira compra. Obrigada pela indicação!`,
    `Como agradecimento, você ganhou: ${mimo}. É só falar com a gente aqui quando quiser usar 🐳`,
  ].join("\n\n");
}
