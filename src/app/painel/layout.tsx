import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { PAGINAS, podeVer, temExtra } from "@/lib/permissoes";
import { sair } from "./acoes";
import estilos from "./painel.module.css";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { lerLoja } from "@/lib/loja/servidor";
import { ModoSoVer } from "./modo-so-ver";

// Toda página dentro de /painel passa por aqui: sem login ou sem perfil de
// administradora/suporte, a pessoa não vê nada. O suporte só vê no menu as
// páginas que a administradora liberou em Equipe (e cada página confere de novo).
export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const usuario = await exigirAcesso("painel", "/painel");
  const { acesso } = usuario;
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
        {PAGINAS.filter((p) => podeVer(acesso, p.chave)).map((p) => (
          <Link key={p.chave} href={`/painel/${p.chave}`} className={p.chave === "pecas" ? estilos.destaque : undefined}>
            {p.nome}
          </Link>
        ))}
        {temExtra(acesso, "backup") && <Link href="/painel/backup">Backup</Link>}
        {acesso.administradora && <Link href="/painel/equipe">Equipe</Link>}
        {acesso.administradora && <Link href="/painel/configuracoes">Configurações</Link>}
        {acesso.administradora && <Link href="/painel/importar">Importar do Notion</Link>}
      </nav>
      <main className={estilos.conteudo}>
        <ModoSoVer paginas={acesso.administradora ? {} : acesso.paginas} />
        {children}
      </main>
    </div>
  );
}
