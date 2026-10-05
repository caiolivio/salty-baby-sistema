import Link from "next/link";
import { LogOut } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { PAGINAS, podeVer, temExtra } from "@/lib/permissoes";
import { sair } from "./acoes";
import estilos from "./painel.module.css";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { lerLoja } from "@/lib/loja/servidor";
import { ModoSoVer } from "./modo-so-ver";
import { MenuDoPainel, type ItemDoMenu } from "./menu-do-painel";

// Toda página dentro de /painel passa por aqui: sem login ou sem perfil de
// administradora/suporte, a pessoa não vê nada. O suporte só vê no menu as
// páginas que a administradora liberou em Equipe (e cada página confere de novo).
export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const usuario = await exigirAcesso("painel", "/painel");
  const { acesso } = usuario;
  const loja = await lerLoja();
  const itens: ItemDoMenu[] = [
    { chave: "", nome: "Início" },
    ...PAGINAS.filter((p) => podeVer(acesso, p.chave)).map((p) => ({ chave: p.chave, nome: p.nome })),
    ...(acesso.administradora ? [
          { chave: "acertos", nome: "Contas a pagar" },
          { chave: "relatorios", nome: "Relatórios" },
          { chave: "financeiro", nome: "Financeiro" },
          { chave: "indicadores", nome: "Indicadores" },
          { chave: "promocoes", nome: "Promoções" },
          { chave: "cupons", nome: "Cupons" },
        ] : []),
    ...(temExtra(acesso, "backup") ? [{ chave: "backup", nome: "Backup" }] : []),
    ...(acesso.administradora
      ? [
          { chave: "equipe", nome: "Equipe" },
          { chave: "configuracoes", nome: "Configurações" },
          { chave: "importar", nome: "Importar do Notion" },
        ]
      : []),
  ];

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
          {children}
        </main>
      </div>
    </div>
  );
}
