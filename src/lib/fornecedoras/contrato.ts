// Aceite do contrato de consignação (CLAUDE.md, "Consignação e fornecedoras"):
// dados confirmados antes do botão, prova de que o contrato foi aberto e lido
// até o fim, e o hash do texto exato que estava na tela. Funções puras, testadas.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { lerTelefoneCliente } from "../pedidos/regras";
import { normalizarEmail } from "../senha";

export const TIPOS_CHAVE_PIX = [
  { valor: "cpf", nome: "CPF" },
  { valor: "telefone", nome: "Telefone" },
  { valor: "email", nome: "E-mail" },
  { valor: "aleatoria", nome: "Aleatória" },
] as const;
export type TipoChavePix = (typeof TIPOS_CHAVE_PIX)[number]["valor"];
export const nomeDoTipoPix = (tipo: string | null | undefined) => TIPOS_CHAVE_PIX.find((t) => t.valor === tipo)?.nome ?? null;

export const FORMAS_RECEBIMENTO = [
  { valor: "pix", nome: "PIX" },
  { valor: "credito", nome: "Crédito na loja" },
] as const;
export type FormaRecebimento = (typeof FORMAS_RECEBIMENTO)[number]["valor"];
export const nomeDaFormaRecebimento = (forma: string | null | undefined, loja?: string) =>
  forma === "credito" ? (loja ? `Crédito ${loja}` : "Crédito na loja") : forma === "pix" ? "PIX" : null;

/** Texto do checkbox obrigatório (pedido pelo Caio, 05/10/2026). */
export const textoDoCheckbox = (loja: string) =>
  `Li e concordo integralmente com o Contrato de Consignação da ${loja}, inclusive com as regras de curadoria, precificação, promoções, prazos, retirada, doação de itens não selecionados e repasses.`;

export const TEXTO_BOTAO_ACEITE = "ACEITAR CONTRATO E CONTINUAR 🐳";

// ---------------------------------------------------------------------------
// CPF e CNPJ com dígitos verificadores.

const repetido = (d: string) => /^(\d)\1+$/.test(d);

export function cpfValido(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 11 || repetido(d)) return false;
  const digito = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function cnpjValido(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 14 || repetido(d)) return false;
  const digito = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((s, p, i) => s + Number(d[i]) * p, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

const emailValido = (t: string) => z.email().safeParse(t).success;

/** Confere a chave Pix pelo tipo e devolve como ela fica guardada. */
export function lerChavePix(tipo: TipoChavePix, chave: string): { ok: true; chave: string } | { ok: false; erro: string } {
  const t = chave.trim();
  if (tipo === "cpf") {
    return cpfValido(t) || cnpjValido(t)
      ? { ok: true, chave: t.replace(/\D/g, "") }
      : { ok: false, erro: "A chave Pix não é um CPF válido." };
  }
  if (tipo === "telefone") {
    const lido = lerTelefoneCliente(t);
    return lido
      ? { ok: true, chave: lido }
      : { ok: false, erro: "Escreva a chave Pix de telefone com DDD, por exemplo (12) 98765-4321." };
  }
  if (tipo === "email") {
    return emailValido(t) ? { ok: true, chave: normalizarEmail(t) } : { ok: false, erro: "A chave Pix não é um e-mail válido." };
  }
  const aleatoria = t.toLowerCase();
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/.test(aleatoria)
    ? { ok: true, chave: aleatoria }
    : { ok: false, erro: "A chave aleatória tem 32 letras e números, no formato 1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d5e6f." };
}

// ---------------------------------------------------------------------------
// Formulário do aceite.

export type DadosDoAceite = {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  pix: string | null;
  pixTipo: TipoChavePix | null;
  recebimentoPreferido: FormaRecebimento;
};

const texto = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Lê os campos do aceite. O checkbox só vale se o contrato foi lido até o fim
 * (`lido` = "sim", marcado pela página quando o fim do texto aparece na tela).
 * A chave Pix é obrigatória para quem prefere receber por Pix.
 */
export function lerAceiteDoContrato(
  valores: Record<string, unknown>,
): { ok: true; dados: DadosDoAceite } | { ok: false; erro: string } {
  if (texto(valores.lido) !== "sim") return { ok: false, erro: "Leia o contrato até o fim antes de aceitar." };
  const nome = texto(valores.nome).trim().replace(/\s+/g, " ");
  if (nome.length < 5 || !nome.includes(" ")) return { ok: false, erro: "Escreva o seu nome completo." };
  if (nome.length > 160) return { ok: false, erro: "Use no máximo 160 caracteres no nome." };
  const documento = texto(valores.documento).replace(/\D/g, "");
  if (!cpfValido(documento) && !cnpjValido(documento)) return { ok: false, erro: "Confira o CPF: os números não batem." };
  const telefone = lerTelefoneCliente(texto(valores.telefone));
  if (!telefone) return { ok: false, erro: "Escreva o WhatsApp com DDD, por exemplo (12) 98765-4321." };
  const email = texto(valores.email).trim();
  if (!emailValido(email) || email.length > 191) return { ok: false, erro: "Confira o e-mail." };

  const forma = texto(valores.recebimento);
  if (forma !== "pix" && forma !== "credito") return { ok: false, erro: "Escolha como prefere receber: PIX ou crédito na loja." };
  const tipo = texto(valores.pixTipo);
  const chave = texto(valores.pix).trim();
  let pix: string | null = null;
  let pixTipo: TipoChavePix | null = null;
  if (chave || forma === "pix") {
    if (!chave) return { ok: false, erro: "Escreva a sua chave Pix para receber os repasses." };
    if (!TIPOS_CHAVE_PIX.some((t) => t.valor === tipo)) return { ok: false, erro: "Escolha o tipo da chave Pix." };
    const lida = lerChavePix(tipo as TipoChavePix, chave);
    if (!lida.ok) return lida;
    if (lida.chave.length > 191) return { ok: false, erro: "Confira a chave Pix." };
    pix = lida.chave;
    pixTipo = tipo as TipoChavePix;
  }
  if (texto(valores.de_acordo) !== "sim") return { ok: false, erro: "Marque que leu e concorda com o contrato." };
  return {
    ok: true,
    dados: { nome, documento, telefone, email: normalizarEmail(email), pix, pixTipo, recebimentoPreferido: forma },
  };
}

// ---------------------------------------------------------------------------
// Evidências: o hash do texto e a hora (assinada) em que a página foi aberta.

/** O texto que fica guardado no aceite: título e contrato, já com as variáveis trocadas. */
export const textoParaGuardar = (titulo: string, conteudo: string) => `${titulo.trim()}\n\n${conteudo.trim()}\n`;

/** O contrato guardado no aceite, sem o título (para mostrar de novo). */
export const conteudoGuardado = (texto: string) => texto.split("\n").slice(2).join("\n");

/** SHA-256 do texto: qualquer mudança de uma letra muda o hash. */
export const hashDoTexto = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex");

const assinatura = (segredo: string, usuarioId: string, hash: string, abertoEm: number) =>
  createHmac("sha256", segredo).update(`contrato|${usuarioId}|${hash}|${abertoEm}`).digest("base64url");

/** Vai num campo escondido do formulário: quando a página com o contrato foi aberta, assinado pelo servidor. */
export function assinarAbertura(segredo: string, usuarioId: string, hash: string, abertoEm: number): string {
  return `${abertoEm}.${assinatura(segredo, usuarioId, hash, abertoEm)}`;
}

/** Validade da página aberta: depois disso, ela precisa abrir o contrato de novo. */
export const HORAS_PARA_ACEITAR = 24;

/**
 * Confere o campo assinado: mesma pessoa, mesmo texto (o contrato não mudou
 * enquanto ela lia) e aberto há menos de 24 horas. Devolve a hora da abertura.
 */
export function conferirAbertura(
  segredo: string,
  usuarioId: string,
  hash: string,
  campo: string,
  agora = Date.now(),
): { ok: true; abertoEm: Date } | { ok: false; motivo: "mudou" | "venceu" } {
  const [tempo, assinado] = campo.split(".");
  const abertoEm = Number(tempo);
  if (!assinado || !Number.isSafeInteger(abertoEm)) return { ok: false, motivo: "mudou" };
  const esperado = Buffer.from(assinatura(segredo, usuarioId, hash, abertoEm));
  const recebido = Buffer.from(assinado);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return { ok: false, motivo: "mudou" };
  if (abertoEm > agora + 60_000 || agora - abertoEm > HORAS_PARA_ACEITAR * 3_600_000) return { ok: false, motivo: "venceu" };
  return { ok: true, abertoEm: new Date(abertoEm) };
}

/** Hora em que ela chegou ao fim do texto (do aparelho): só vale entre a abertura e agora. */
export function lerLidoEm(valor: unknown, abertoEm: Date, agora = new Date()): Date | null {
  const n = Number(texto(valor));
  if (!Number.isSafeInteger(n) || n < abertoEm.getTime() - 60_000 || n > agora.getTime() + 60_000) return null;
  return new Date(n);
}
