"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { desligarDrive, executarBackup, iniciarBackup } from "@/lib/backup/executar";

// Botões da página de backup (só administradora).

export async function fazerCopiaAgora(): Promise<void> {
  await exigirAcesso("painel-administracao", "/painel/backup");
  const inicio = await iniciarBackup("painel");
  if ("emAndamento" in inicio) redirect("/painel/backup?erro=em-andamento");
  // A cópia continua depois que a página responde; a tela se atualiza sozinha.
  after(() => executarBackup(inicio.id));
  refresh();
}

export async function desconectarDrive(): Promise<void> {
  await exigirAcesso("painel-administracao", "/painel/backup");
  await desligarDrive();
  redirect("/painel/backup?drive=desligado");
}
