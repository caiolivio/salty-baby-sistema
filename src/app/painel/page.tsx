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
  const administradora = podeAcessar(usuario.perfis, "painel-administracao");
  const [aVenda, fornecedoras, reservados, devolucoes, inscricoes] = await Promise.all([
    prisma.peca.count({ where: { status: "publicada" } }),
    prisma.fornecedora.count(),
    prisma.pedido.count({ where: { status: "reservado" } }),
    prisma.devolucao.count({ where: { situacao: "pedida" } }),
    administradora ? prisma.candidatura.count({ where: { etapa: { in: ["enviada", "acordo_aceito"] } } }) : 0,
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
        {devolucoes > 0 && (
          <Link href="/painel/devolucoes" className={estilos.cartao}>
            <strong>{devolucoes}</strong>
            {devolucoes === 1 ? "peça para devolver" : "peças para devolver"}
          </Link>
        )}
        {inscricoes > 0 && (
          <Link href="/painel/candidaturas" className={estilos.cartao}>
            <strong>{inscricoes}</strong>
            {inscricoes === 1 ? "inscrição de fornecedora esperando você" : "inscrições de fornecedora esperando você"}
          </Link>
        )}
        {administradora && fornecedoras === 0 && (
          <Link href="/painel/importar" className={estilos.cartao}>
            <strong>Notion</strong>
            importar as peças e fornecedoras
          </Link>
        )}
      </div>
    </>
  );
}
