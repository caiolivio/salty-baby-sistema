import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { podeAcessar } from "@/lib/permissoes";
import estilos from "./painel.module.css";

export const metadata: Metadata = { title: "Painel · Salty Baby" };

export default async function Painel() {
  const usuario = await exigirAcesso("painel", "/painel");
  const primeiroNome = usuario.nome.split(" ")[0];
  await liberarReservasVencidas();
  const [aVenda, fornecedoras, reservados] = await Promise.all([
    prisma.peca.count({ where: { status: "publicada" } }),
    prisma.fornecedora.count(),
    prisma.pedido.count({ where: { status: "reservado" } }),
  ]);

  return (
    <>
      <h1 className={estilos.titulo}>Olá, {primeiroNome}!</h1>
      <div className={estilos.cartoes}>
        <Link href="/painel/pecas" className={estilos.cartao}>
          <strong>{aVenda}</strong>
          peças à venda
        </Link>
        <Link href="/painel/pedidos" className={estilos.cartao}>
          <strong>{reservados}</strong>
          {reservados === 1 ? "pedido reservado agora" : "pedidos reservados agora"}
        </Link>
        <Link href="/painel/fornecedoras" className={estilos.cartao}>
          <strong>{fornecedoras}</strong>
          fornecedoras
        </Link>
        {podeAcessar(usuario.perfis, "painel-administracao") && fornecedoras === 0 && (
          <Link href="/painel/importar" className={estilos.cartao}>
            <strong>Notion</strong>
            importar as peças e fornecedoras
          </Link>
        )}
      </div>
    </>
  );
}
