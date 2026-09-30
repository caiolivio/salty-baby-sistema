import "server-only";
import mysql from "mysql2/promise";

// A conexão vem de variáveis de ambiente, que a publicação grava no servidor
// a partir dos segredos do GitHub. Nunca coloque senhas no código.
let pool: mysql.Pool | undefined;

function obterPool(): mysql.Pool {
  pool ??= mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NOME,
    user: process.env.DB_USUARIO,
    password: process.env.DB_SENHA,
    connectionLimit: 5,
    connectTimeout: 5_000,
    timezone: "Z",
  });
  return pool;
}

export type SituacaoBanco = { conectado: true } | { conectado: false; motivo: string };

export async function verificarBanco(): Promise<SituacaoBanco> {
  if (!process.env.DB_NOME || !process.env.DB_USUARIO) {
    return { conectado: false, motivo: "banco não configurado" };
  }
  try {
    await obterPool().query("SELECT 1");
    return { conectado: true };
  } catch (erro) {
    const codigo = (erro as { code?: string }).code ?? "erro desconhecido";
    console.error("Falha ao conectar no banco:", erro);
    return { conectado: false, motivo: codigo };
  }
}
