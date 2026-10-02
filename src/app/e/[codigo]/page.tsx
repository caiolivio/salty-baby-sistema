import { redirect } from "next/navigation";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";

// Endereço gravado no QR da etiqueta: /e/<código da peça>. Leva para a peça no
// painel. Sem login, volta aqui depois de entrar.
export default async function AbrirEtiqueta({ params }: PageProps<"/e/[codigo]">) {
  const { codigo } = await params;
  await exigirPagina("pecas", "ver", `/e/${codigo}`);
  const peca = await prisma.peca.findUnique({ where: { codigo: decodeURIComponent(codigo).toUpperCase() }, select: { id: true } });
  redirect(peca ? `/painel/pecas/${peca.id}` : `/painel/pecas?q=${encodeURIComponent(codigo.toUpperCase())}`);
}
