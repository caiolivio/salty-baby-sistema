import { connection } from "next/server";
import { executarBackup, iniciarBackup } from "@/lib/backup/executar";
import { chaveConfere } from "@/lib/backup/regras";

// Chamado todo dia pelo cron da VPS (instalado por scripts/servidor/publicar.sh),
// com a chave do servidor no cabeçalho. Responde quando a cópia termina.
export async function POST(pedido: Request) {
  await connection();
  if (!chaveConfere(pedido.headers.get("x-chave-backup"), process.env.BACKUP_CHAVE)) {
    return new Response("Sem acesso", { status: 403 });
  }
  const inicio = await iniciarBackup("agendada");
  if ("emAndamento" in inicio) {
    return Response.json({ ok: false, mensagem: "Já tem uma cópia em andamento." }, { status: 409 });
  }
  const resultado = await executarBackup(inicio.id);
  const quando = new Date().toISOString();
  return new Response(`${quando} ${resultado.ok ? "OK" : "ERRO"} ${resultado.mensagem}\n`, {
    status: resultado.ok ? 200 : 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
