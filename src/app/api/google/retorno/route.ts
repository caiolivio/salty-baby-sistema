import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exigirExtra } from "@/lib/acesso";
import { COOKIE_ESTADO, ErroDoDrive, trocarCodigo } from "@/lib/backup/drive";
import { guardarLigacao } from "@/lib/backup/executar";
import { emailDoIdToken } from "@/lib/backup/regras";

// O Google volta para cá depois que a administradora autoriza (ou recusa).
export async function GET(pedido: Request) {
  await exigirExtra("backup", "/painel/backup");
  const parametros = new URL(pedido.url).searchParams;
  const potes = await cookies();
  const esperado = potes.get(COOKIE_ESTADO)?.value;
  potes.delete({ name: COOKIE_ESTADO, path: "/api/google" });

  if (parametros.get("error")) redirect("/painel/backup?erro=recusado");
  const codigo = parametros.get("code");
  if (!codigo || !esperado || parametros.get("state") !== esperado) redirect("/painel/backup?erro=expirou");

  let destino = "/painel/backup?drive=ligado";
  try {
    const { autorizacao, idToken } = await trocarCodigo(codigo);
    await guardarLigacao(autorizacao, emailDoIdToken(idToken));
  } catch (erro) {
    console.error("Falha ao conectar o Google Drive:", erro);
    destino = `/painel/backup?erro=${erro instanceof ErroDoDrive && erro.codigo ? erro.codigo : "falhou"}`;
  }
  redirect(destino);
}
