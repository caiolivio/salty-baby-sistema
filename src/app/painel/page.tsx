import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Megaphone, Plus, Receipt, Shirt, Store, Undo2, Upload, UserPlus } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { podeAlterar, podeVer, type Pagina } from "@/lib/permissoes";
import estilos from "./painel.module.css";
import { InstalarApp } from "@/componentes/app-instalavel";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Painel" };

export default async function Painel() {
  const usuario = await exigirAcesso("painel", "/painel");
  const primeiroNome = usuario.nome.split(" ")[0];
  await liberarReservasVencidas();
  const { acesso } = usuario;
  const administradora = acesso.administradora;
  // Cada número só aparece para quem pode abrir a página dele.
  const ve = (pagina: Pagina) => podeVer(acesso, pagina);
  const [aVenda, fornecedoras, reservados, devolucoes, inscricoes] = await Promise.all([
    ve("pecas") ? prisma.peca.count({ where: { status: "publicada" } }) : 0,
    ve("fornecedoras") || administradora ? prisma.fornecedora.count() : 0,
    ve("pedidos") ? prisma.pedido.count({ where: { status: "reservado" } }) : 0,
    ve("devolucoes") ? prisma.devolucao.count({ where: { situacao: "pedida" } }) : 0,
    ve("candidaturas") ? prisma.candidatura.count({ where: { etapa: { in: ["enviada", "acordo_aceito"] } } }) : 0,
  ]);
  const loja = await lerLoja();
  const nenhuma = !administradora && Object.keys(acesso.paginas).length === 0;

  return (
    <>
      <p className="sobretitulo">
        {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(
          new Date(),
        )}
      </p>
      <h1 className={estilos.tituloGrande}>Olá, {primeiroNome}!</h1>
      <InstalarApp nome={loja.nomeCurto} className={estilos.instalarApp} />
      <div className={estilos.atalhosInicio}>
        {podeAlterar(acesso, "pecas") && (
          <Link href="/painel/pecas/nova" className={estilos.atalhoInicio}>
            <Plus className="icone" aria-hidden />
            Nova peça
          </Link>
        )}
        {administradora && (
          <Link href="/painel/vendas/nova" className={estilos.atalhoInicio}>
            <Receipt className="icone" aria-hidden />
            Nova venda
          </Link>
        )}
        {ve("marketing") && (
          <Link href="/painel/marketing" className={estilos.atalhoInicio}>
            <Megaphone className="icone" aria-hidden />
            Divulgar no WhatsApp
          </Link>
        )}
      </div>
      {nenhuma && <p>Você ainda não tem nenhuma página liberada. Peça à administradora para liberar em Equipe.</p>}
      <div className={estilos.cartoes}>
        {ve("pecas") && (
          <Link href="/painel/pecas" className={estilos.cartao}>
            <Shirt className="icone" aria-hidden />
            <strong>{aVenda}</strong>
            peças à venda
          </Link>
        )}
        {ve("pedidos") && (
          <Link href="/painel/pedidos" className={estilos.cartao}>
            <ClipboardList className="icone" aria-hidden />
            <strong>{reservados}</strong>
            {reservados === 1 ? "pedido reservado agora" : "pedidos reservados agora"}
          </Link>
        )}
        {ve("fornecedoras") && (
          <Link href="/painel/fornecedoras" className={estilos.cartao}>
            <Store className="icone" aria-hidden />
            <strong>{fornecedoras}</strong>
            fornecedoras
          </Link>
        )}
        {devolucoes > 0 && (
          <Link href="/painel/devolucoes" className={estilos.cartao}>
            <Undo2 className="icone" aria-hidden />
            <strong>{devolucoes}</strong>
            {devolucoes === 1 ? "peça para devolver" : "peças para devolver"}
          </Link>
        )}
        {inscricoes > 0 && (
          <Link href="/painel/candidaturas" className={estilos.cartao}>
            <UserPlus className="icone" aria-hidden />
            <strong>{inscricoes}</strong>
            {inscricoes === 1 ? "inscrição de fornecedora esperando você" : "inscrições de fornecedora esperando você"}
          </Link>
        )}
        {administradora && fornecedoras === 0 && (
          <Link href="/painel/importar" className={estilos.cartao}>
            <Upload className="icone" aria-hidden />
            <strong>Notion</strong>
            importar as peças e fornecedoras
          </Link>
        )}
      </div>
    </>
  );
}
