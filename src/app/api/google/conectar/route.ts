import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { COOKIE_ESTADO, driveConfigurado, enderecoDeAutorizacao } from "@/lib/backup/drive";

// Leva a administradora para a tela do Google que autoriza o sistema a guardar
// as cópias no Drive. O "estado" confere, na volta, que foi ela quem pediu.
export async function GET() {
  await exigirAcesso("painel-administracao", "/painel/backup");
  if (!driveConfigurado()) redirect("/painel/backup?erro=sem-chave");
  const estado = randomBytes(24).toString("hex");
  (await cookies()).set(COOKIE_ESTADO, estado, {
    path: "/api/google",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
  });
  redirect(enderecoDeAutorizacao(estado));
}
