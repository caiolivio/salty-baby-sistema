import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { lerLoja } from "@/lib/loja/servidor";
import { manifestoDaLoja } from "@/lib/pwa/regras";

// Manifesto do app instalável, com o nome, a cor e o ícone de Configurações.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  await connection();
  return manifestoDaLoja(await lerLoja());
}
