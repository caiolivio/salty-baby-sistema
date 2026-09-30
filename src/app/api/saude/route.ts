import { connection } from "next/server";
import { verificarBanco } from "@/lib/banco";

// Usado pela publicação para confirmar que o sistema subiu e alcança o banco.
export async function GET() {
  await connection();
  const banco = await verificarBanco();
  return Response.json(
    { sistema: "ok", banco: banco.conectado ? "ok" : banco.motivo, versao: process.env.VERSAO ?? "local" },
    { status: banco.conectado ? 200 : 503 },
  );
}
