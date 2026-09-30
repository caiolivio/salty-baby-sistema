import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

// A conexão vem de variáveis de ambiente, que a publicação grava no servidor
// a partir dos segredos do GitHub. Nunca coloque senhas no código.
function criarCliente() {
  const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NOME,
    user: process.env.DB_USUARIO,
    password: process.env.DB_SENHA,
    connectionLimit: 5,
    connectTimeout: 5_000,
    timezone: "Z",
  });
  return new PrismaClient({ adapter });
}

// Em desenvolvimento o Next recarrega os arquivos; guardar o cliente evita abrir
// uma conexão nova a cada recarga.
const global = globalThis as unknown as { prisma?: ReturnType<typeof criarCliente> };
export const prisma = global.prisma ?? criarCliente();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export type SituacaoBanco = { conectado: true } | { conectado: false; motivo: string };

export async function verificarBanco(): Promise<SituacaoBanco> {
  if (!process.env.DB_NOME || !process.env.DB_USUARIO) {
    return { conectado: false, motivo: "banco não configurado" };
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { conectado: true };
  } catch (erro) {
    const causa = erro as { code?: string; cause?: { code?: string } };
    const codigo = causa.cause?.code ?? causa.code ?? "erro desconhecido";
    console.error("Falha ao conectar no banco:", erro);
    return { conectado: false, motivo: codigo };
  }
}
