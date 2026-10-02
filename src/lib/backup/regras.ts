import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Regras das cópias de segurança (backup): nomes, quais guardar e a cifra da
// autorização do Google. Sem banco nem rede, para poder testar.

/** Cópias do banco guardadas na própria VPS (as mais recentes). */
export const COPIAS_NO_SERVIDOR = 7;
/** No Google Drive: a mais recente de cada um dos últimos 7 dias... */
export const DIAS_NO_DRIVE = 7;
/** ...e a mais recente de cada uma das últimas 5 semanas (a atual entra aqui também). */
export const SEMANAS_NO_DRIVE = 5;
/** Uma cópia "rodando" há mais tempo que isso foi interrompida. */
export const LIMITE_RODANDO_MS = 3 * 60 * 60 * 1000;

const PREFIXO = "banco-";
const SUFIXO = ".sql.gz";

function partesEmSaoPaulo(momento: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(momento);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? "00";
  return { dia: `${p("year")}-${p("month")}-${p("day")}`, hora: `${p("hour")}${p("minute")}${p("second")}` };
}

/** Ex.: banco-2026-10-01-030000.sql.gz (horário de São Paulo). */
export function nomeDaCopia(momento: Date): string {
  const { dia, hora } = partesEmSaoPaulo(momento);
  return `${PREFIXO}${dia}-${hora}${SUFIXO}`;
}

/** Dia (aaaa-mm-dd) de uma cópia pelo nome, ou null se o arquivo não é uma cópia. */
export function diaDaCopia(nome: string): string | null {
  const achado = /^banco-(\d{4}-\d{2}-\d{2})-\d{6}\.sql\.gz$/.exec(nome);
  return achado ? achado[1] : null;
}

/** Segunda-feira da semana do dia (aaaa-mm-dd), para agrupar as cópias semanais. */
export function semanaDoDia(dia: string): string {
  const data = new Date(`${dia}T12:00:00Z`);
  const desdeSegunda = (data.getUTCDay() + 6) % 7;
  data.setUTCDate(data.getUTCDate() - desdeSegunda);
  return data.toISOString().slice(0, 10);
}

/**
 * Das cópias que estão no Drive, quais apagar: fica a mais recente de cada um
 * dos últimos 7 dias e a mais recente de cada uma das últimas 5 semanas.
 * Arquivos que não são cópias (outro nome) nunca são apagados.
 */
export function copiasParaApagar(nomes: readonly string[]): string[] {
  const copias = nomes.filter((n) => diaDaCopia(n)).sort().reverse(); // mais nova primeiro
  const ficam = new Set<string>();
  const dias = new Set<string>();
  const semanas = new Set<string>();
  for (const nome of copias) {
    const dia = diaDaCopia(nome)!;
    if (!dias.has(dia) && dias.size < DIAS_NO_DRIVE) {
      dias.add(dia);
      ficam.add(nome);
    }
    const semana = semanaDoDia(dia);
    if (!semanas.has(semana) && semanas.size < SEMANAS_NO_DRIVE) {
      semanas.add(semana);
      ficam.add(nome);
    }
  }
  return copias.filter((n) => !ficam.has(n));
}

/** Na VPS ficam só as cópias mais recentes. */
export function copiasLocaisParaApagar(nomes: readonly string[]): string[] {
  return nomes.filter((n) => diaDaCopia(n)).sort().reverse().slice(COPIAS_NO_SERVIDOR);
}

/** Arquivo de opções do mysqldump, para a senha não aparecer na lista de processos. */
export function opcoesDoMysql(dados: { host: string; porta: number; usuario: string; senha: string }): string {
  const aspas = (valor: string) => `"${valor.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return [
    "[client]",
    `host=${aspas(dados.host)}`,
    `port=${dados.porta}`,
    `user=${aspas(dados.usuario)}`,
    `password=${aspas(dados.senha)}`,
    "",
  ].join("\n");
}

/** Compara a chave do agendamento sem revelar, pelo tempo de resposta, onde ela difere. */
export function chaveConfere(recebida: string | null, esperada: string | undefined): boolean {
  if (!recebida || !esperada || esperada.length < 32) return false;
  const a = createHash("sha256").update(recebida).digest();
  const b = createHash("sha256").update(esperada).digest();
  return timingSafeEqual(a, b);
}

function chaveDaCifra(segredo: string): Buffer {
  return createHash("sha256").update(`google-drive:${segredo}`).digest();
}

/** Cifra a autorização do Google com a chave do servidor (AES-256-GCM). */
export function cifrar(texto: string, segredo: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chaveDaCifra(segredo), iv);
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return [iv, cifra.getAuthTag(), conteudo].map((b) => b.toString("base64url")).join(".");
}

/** Devolve null se a chave do servidor mudou ou o texto foi alterado. */
export function decifrar(cifrado: string, segredo: string): string | null {
  try {
    const [iv, etiqueta, conteudo] = cifrado.split(".").map((p) => Buffer.from(p, "base64url"));
    const decifra = createDecipheriv("aes-256-gcm", chaveDaCifra(segredo), iv);
    decifra.setAuthTag(etiqueta);
    return Buffer.concat([decifra.update(conteudo), decifra.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** E-mail da conta Google, lido do id_token que o próprio Google devolveu. */
export function emailDoIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const carga = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return typeof carga.email === "string" ? carga.email : null;
  } catch {
    return null;
  }
}

/** Ex.: 1,5 MB */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  const unidades = ["KB", "MB", "GB"];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unidades[i]}`;
}
