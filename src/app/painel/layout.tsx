import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { podeAcessar } from "@/lib/permissoes";
import { sair } from "./acoes";
import estilos from "./painel.module.css";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { lerLoja } from "@/lib/loja/servidor";

// Toda página dentro de /painel passa por aqui: sem login ou sem perfil de
// administradora/ajudante, a pessoa não vê nada.
export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const usuario = await exigirAcesso("painel", "/painel");
  const administradora = podeAcessar(usuario.perfis, "painel-administracao");
  const loja = await lerLoja();

  return (
    <div className={estilos.estrutura}>
      <header className={estilos.topo}>
        <Link href="/painel" className={estilos.marca}>
          <LogoDaLoja tipo="icone" alt="" largura={40} altura={40} className={estilos.logo} />
          <span>{loja.nome} · Painel</span>
        </Link>
        <div className={estilos.usuario}>
          <span className={estilos.nomeUsuario}>{usuario.nome}</span>
          <form action={sair}>
            <button type="submit" className={estilos.sair}>
              Sair
            </button>
          </form>
        </div>
      </header>
      <nav className={estilos.menu} aria-label="Painel">
        <Link href="/painel">Início</Link>
        <Link href="/painel/pecas" className={estilos.destaque}>
          Peças
        </Link>
        {administradora && <Link href="/painel/categorias">Categorias</Link>}
        <Link href="/painel/marketing">WhatsApp Marketing</Link>
        <Link href="/painel/fornecedoras">Fornecedoras</Link>
        {administradora && <Link href="/painel/candidaturas">Seja fornecedora</Link>}
        <Link href="/painel/devolucoes">Devoluções</Link>
        <Link href="/painel/pedidos">Pedidos</Link>
        <Link href="/painel/clientes">Clientes</Link>
        {administradora && <Link href="/painel/vendas">Vendas</Link>}
        {administradora && <Link href="/painel/historico">Histórico</Link>}
        {administradora && <Link href="/painel/backup">Backup</Link>}
        {administradora && <Link href="/painel/configuracoes">Configurações</Link>}
        {administradora && <Link href="/painel/importar">Importar do Notion</Link>}
      </nav>
      <main className={estilos.conteudo}>{children}</main>
    </div>
  );
}
