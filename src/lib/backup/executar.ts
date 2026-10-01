import "server-only";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { prisma } from "@/lib/banco";
import { pastaDeFotos } from "@/lib/fotos";
import * as drive from "./drive";
import {
  LIMITE_RODANDO_MS,
  cifrar,
  copiasLocaisParaApagar,
  copiasParaApagar,
  decifrar,
  nomeDaCopia,
  opcoesDoMysql,
} from "./regras";

// Cópia de segurança: grava o banco inteiro num arquivo compactado na VPS e,
// se o Google Drive estiver ligado, envia esse arquivo e as fotos novas para lá.
// Roda todo dia pelo cron do servidor (POST /api/backup) e pelo botão do painel.

/** Fotos enviadas por vez; o que faltar vai na cópia do dia seguinte. */
const FOTOS_POR_VEZ = 3000;

export function pastaDeBackups(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.BACKUP_DIR ?? path.join(process.cwd(), "dados", "backups"));
}

function segredoDoServidor(): string {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) throw new Error("AUTH_SECRET não configurado");
  return segredo;
}

function nomeDaPastaNoDrive(): string {
  const site = (process.env.AUTH_URL ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return site ? `Salty Baby · cópias de segurança (${site})` : "Salty Baby · cópias de segurança";
}

// ---------------------------------------------------------------- ligação com o Drive

export async function situacaoDoDrive() {
  const ligacao = await prisma.googleDrive.findUnique({ where: { id: 1 } });
  return {
    configurado: drive.driveConfigurado(),
    conectado: Boolean(ligacao),
    email: ligacao?.email ?? null,
    conectadoEm: ligacao?.conectadoEm ?? null,
    linkDaPasta: ligacao?.pastaId ? drive.linkDaPasta(ligacao.pastaId) : null,
    enderecoDeRetorno: drive.enderecoDeRetorno(),
  };
}

export async function guardarLigacao(autorizacao: string, email: string | null) {
  const dados = { email, autorizacaoCifrada: cifrar(autorizacao, segredoDoServidor()), conectadoEm: new Date() };
  const anterior = await prisma.googleDrive.findUnique({ where: { id: 1 } });
  if (anterior && anterior.email !== email) {
    // Outra conta: as pastas e fotos já enviadas ficaram na conta anterior.
    await prisma.$transaction([
      prisma.googleDrive.update({ where: { id: 1 }, data: { ...dados, pastaId: null, pastaFotosId: null } }),
      prisma.backupFoto.deleteMany(),
    ]);
    return;
  }
  await prisma.googleDrive.upsert({ where: { id: 1 }, create: { id: 1, ...dados }, update: dados });
}

export async function desligarDrive() {
  const ligacao = await prisma.googleDrive.findUnique({ where: { id: 1 } });
  if (!ligacao) return;
  const autorizacao = decifrar(ligacao.autorizacaoCifrada, segredoDoServidor());
  if (autorizacao) await drive.revogar(autorizacao);
  await prisma.$transaction([prisma.googleDrive.delete({ where: { id: 1 } }), prisma.backupFoto.deleteMany()]);
}

// ---------------------------------------------------------------- cópia do banco

async function copiarBanco(destino: string): Promise<void> {
  const opcoes = path.join(path.dirname(destino), `.mysql-${process.pid}.cnf`);
  await writeFile(
    opcoes,
    opcoesDoMysql({
      host: process.env.DB_HOST ?? "127.0.0.1",
      porta: Number(process.env.DB_PORT ?? 3306),
      usuario: process.env.DB_USUARIO ?? "",
      senha: process.env.DB_SENHA ?? "",
    }),
    { mode: 0o600 },
  );
  try {
    const argumentos = [
      `--defaults-extra-file=${opcoes}`,
      "--single-transaction", // copia sem travar o site
      "--quick",
      "--no-tablespaces",
      "--skip-lock-tables",
      "--default-character-set=utf8mb4",
      "--hex-blob",
      process.env.DB_NOME ?? "",
    ];
    try {
      await rodarDump("mysqldump", argumentos, destino);
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
      await rodarDump("mariadb-dump", argumentos, destino);
    }
  } finally {
    await rm(opcoes, { force: true });
  }
}

async function rodarDump(programa: string, argumentos: string[], destino: string): Promise<void> {
  const processo = spawn(programa, argumentos, { stdio: ["ignore", "pipe", "pipe"] });
  let avisos = "";
  processo.stderr.on("data", (parte: Buffer) => {
    avisos = (avisos + parte.toString()).slice(-2000);
  });
  const terminou = new Promise<number>((resolver, rejeitar) => {
    processo.on("error", rejeitar);
    processo.on("close", (codigo) => resolver(codigo ?? 1));
  });
  // Se o programa nem existe, o erro chega antes de qualquer dado.
  const [codigo] = await Promise.all([terminou, pipeline(processo.stdout, createGzip(), createWriteStream(destino, { mode: 0o600 }))]);
  if (codigo !== 0) {
    const motivo = avisos
      .split("\n")
      .filter((l) => l.trim() && !/Warning|Deprecated/i.test(l))
      .join(" ")
      .slice(0, 400);
    throw new Error(`A cópia do banco falhou: ${motivo || `código ${codigo}`}`);
  }
}

// ---------------------------------------------------------------- envio ao Drive

async function arquivosDeFotos(pasta: string, prefixo = ""): Promise<string[]> {
  const entradas = await readdir(path.join(pasta, prefixo), { withFileTypes: true }).catch(() => []);
  const lista: string[] = [];
  for (const entrada of entradas) {
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) lista.push(...(await arquivosDeFotos(pasta, relativo)));
    else if (entrada.isFile()) lista.push(relativo);
  }
  return lista;
}

async function enviarAoDrive(arquivo: string): Promise<{ fotos: number; faltam: number }> {
  const ligacao = await prisma.googleDrive.findUnique({ where: { id: 1 } });
  if (!ligacao) throw new Error("sem Drive");
  const autorizacao = decifrar(ligacao.autorizacaoCifrada, segredoDoServidor());
  if (!autorizacao) throw new drive.ErroDoDrive("A chave do servidor mudou. Conecte o Google Drive de novo.", true);
  let chave = await drive.chaveDeAcesso(autorizacao);
  let chaveObtidaEm = Date.now();
  const chaveAtual = async () => {
    if (Date.now() - chaveObtidaEm > 45 * 60 * 1000) {
      chave = await drive.chaveDeAcesso(autorizacao);
      chaveObtidaEm = Date.now();
    }
    return chave;
  };

  // Pasta principal (refeita se alguém apagou).
  let pastaId = ligacao.pastaId;
  if (!pastaId || !(await drive.pastaExiste(chave, pastaId))) {
    pastaId = await drive.criarPasta(chave, nomeDaPastaNoDrive());
    await prisma.googleDrive.update({ where: { id: 1 }, data: { pastaId, pastaFotosId: null } });
    await prisma.backupFoto.deleteMany();
  }
  let pastaFotosId = (await prisma.googleDrive.findUnique({ where: { id: 1 } }))?.pastaFotosId ?? null;
  if (!pastaFotosId || !(await drive.pastaExiste(chave, pastaFotosId))) {
    pastaFotosId = await drive.subpasta(chave, "fotos", pastaId);
    await prisma.googleDrive.update({ where: { id: 1 }, data: { pastaFotosId } });
    await prisma.backupFoto.deleteMany();
  }

  // 1. O banco.
  await drive.enviarArquivo(chave, pastaId, path.basename(arquivo), await readFile(arquivo), "application/gzip");

  // 2. Guarda os últimos 7 dias e uma cópia por semana; apaga as outras.
  const noDrive = await drive.listarArquivos(chave, pastaId);
  const apagar = new Set(copiasParaApagar(noDrive.map((a) => a.name)));
  for (const antigo of noDrive.filter((a) => apagar.has(a.name))) await drive.apagarArquivo(chave, antigo.id);

  // 3. Fotos: só as que ainda não foram, mantendo as subpastas.
  const raiz = pastaDeFotos();
  const jaEnviadas = new Set((await prisma.backupFoto.findMany({ select: { caminho: true } })).map((f) => f.caminho));
  const novas = (await arquivosDeFotos(raiz)).filter((c) => !jaEnviadas.has(c) && c.length <= 191);
  const pastas = new Map<string, string>([["", pastaFotosId]]);
  const pastaDe = async (relativa: string): Promise<string> => {
    const conhecida = pastas.get(relativa);
    if (conhecida) return conhecida;
    const pai = await pastaDe(relativa.includes("/") ? relativa.slice(0, relativa.lastIndexOf("/")) : "");
    const id = await drive.subpasta(await chaveAtual(), relativa.slice(relativa.lastIndexOf("/") + 1), pai);
    pastas.set(relativa, id);
    return id;
  };
  let enviadas = 0;
  for (const caminho of novas.slice(0, FOTOS_POR_VEZ)) {
    const pasta = await pastaDe(caminho.includes("/") ? caminho.slice(0, caminho.lastIndexOf("/")) : "");
    const conteudo = await readFile(path.join(raiz, caminho)).catch(() => null);
    if (!conteudo) continue; // apagada no meio do caminho
    const tipo = caminho.endsWith(".webp") ? "image/webp" : "application/octet-stream";
    const driveId = await drive.enviarArquivo(await chaveAtual(), pasta, path.basename(caminho), conteudo, tipo);
    await prisma.backupFoto.create({ data: { caminho, driveId } });
    enviadas++;
  }
  return { fotos: enviadas, faltam: Math.max(0, novas.length - FOTOS_POR_VEZ) };
}

// ---------------------------------------------------------------- a cópia completa

export type ResultadoDoBackup = { ok: boolean; mensagem: string; backupId?: string };

/** Abre o registro da cópia, ou recusa se já tem uma em andamento. */
export async function iniciarBackup(origem: "agendada" | "painel"): Promise<{ id: string } | { emAndamento: true }> {
  const limite = new Date(Date.now() - LIMITE_RODANDO_MS);
  await prisma.backup.updateMany({
    where: { situacao: "rodando", iniciadoEm: { lt: limite } },
    data: { situacao: "erro", mensagem: "Interrompida (o sistema reiniciou no meio da cópia).", terminadoEm: new Date() },
  });
  if (await prisma.backup.findFirst({ where: { situacao: "rodando" }, select: { id: true } })) {
    return { emAndamento: true };
  }
  return prisma.backup.create({ data: { origem }, select: { id: true } });
}

export async function executarBackup(id: string): Promise<ResultadoDoBackup> {
  const pasta = pastaDeBackups();
  const nome = nomeDaCopia(new Date());
  const destino = path.join(pasta, nome);
  try {
    await mkdir(pasta, { recursive: true, mode: 0o700 });
    await copiarBanco(`${destino}.parcial`);
    await rename(`${destino}.parcial`, destino);
    const { size } = await stat(destino);
    await prisma.backup.update({ where: { id }, data: { arquivo: nome, tamanho: size } });

    // Na VPS ficam só as mais recentes.
    const locais = await readdir(pasta);
    for (const antigo of copiasLocaisParaApagar(locais)) await rm(path.join(pasta, antigo), { force: true });

    if (!(await prisma.googleDrive.findUnique({ where: { id: 1 }, select: { id: true } }))) {
      const mensagem = "Cópia guardada só no servidor: o Google Drive não está conectado.";
      await prisma.backup.update({ where: { id }, data: { situacao: "ok", mensagem, terminadoEm: new Date() } });
      return { ok: true, mensagem, backupId: id };
    }
    const { fotos, faltam } = await enviarAoDrive(destino);
    const mensagem =
      `Cópia do banco enviada ao Google Drive` +
      (fotos ? `, com ${fotos} foto(s) nova(s)` : ", sem fotos novas") +
      (faltam ? `. Faltam ${faltam} foto(s), que vão na próxima cópia.` : ".");
    await prisma.backup.update({
      where: { id },
      data: { situacao: "ok", noDrive: true, fotosEnviadas: fotos, mensagem, terminadoEm: new Date() },
    });
    return { ok: true, mensagem, backupId: id };
  } catch (erro) {
    await rm(`${destino}.parcial`, { force: true });
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error("Falha no backup:", erro);
    // A cópia pode ter ficado no servidor mesmo com o Drive falhando.
    const ficou = await stat(destino).then(() => true, () => false);
    await prisma.backup.update({
      where: { id },
      data: {
        situacao: "erro",
        mensagem: ficou ? `A cópia ficou no servidor, mas não foi para o Google Drive: ${mensagem}` : mensagem,
        terminadoEm: new Date(),
      },
    });
    return { ok: false, mensagem, backupId: id };
  }
}

export async function ultimosBackups(quantos = 15) {
  return prisma.backup.findMany({ orderBy: { iniciadoEm: "desc" }, take: quantos });
}

export async function copiasNoServidor() {
  const pasta = pastaDeBackups();
  const nomes = (await readdir(pasta).catch(() => [] as string[])).filter((n) => n.endsWith(".sql.gz")).sort().reverse();
  return Promise.all(nomes.map(async (nome) => ({ nome, tamanho: (await stat(path.join(pasta, nome))).size })));
}
