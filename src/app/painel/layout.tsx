import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { itensDoMenu } from "@/lib/painel/menu";
import { sair } from "./acoes";
import estilos from "./painel.module.css";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { lerLoja } from "@/lib/loja/servidor";
import { ModoSoVer } from "./modo-so-ver";
import { AbasDoGrupo, MenuDoPainel } from "./menu-do-painel";

// Toda página dentro de /painel passa por aqui: sem login ou sem perfil de
// administradora/suporte, a pessoa não vê nada. O suporte só vê no menu as
// páginas que a administradora liberou em Equipe (e cada página confere de novo).
export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const usuario = await exigirAcesso("painel", "/painel");
  const { acesso } = usuario;
  const loja = await lerLoja();
  const itens = itensDoMenu(acesso);

  return (
    <div className={estilos.estrutura}>
      <header className={estilos.topo}>
        <Link href="/painel" className={estilos.marca}>
          <LogoDaLoja tipo="icone" alt="" largura={40} altura={40} className={estilos.logo} />
          <span>{loja.nome} · Painel</span>
        </Link>
        <div className={estilos.usuario}>
          <Link href="/painel/meus-dados" className={estilos.sair} aria-label="Meus dados">
            <UserRound className="icone" aria-hidden />
            <span className={estilos.nomeUsuario}>{usuario.nome}</span>
          </Link>
          <form action={sair}>
            <button type="submit" className={estilos.sair} aria-label="Sair">
              <LogOut className="icone" aria-hidden />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </header>
      <div className={estilos.corpo}>
        <MenuDoPainel itens={itens} />
        <main className={estilos.conteudo}>
          <ModoSoVer paginas={acesso.administradora ? {} : acesso.paginas} />
          <AbasDoGrupo itens={itens} />
          {children}
        </main>
      </div>
    </div>
  );
}
