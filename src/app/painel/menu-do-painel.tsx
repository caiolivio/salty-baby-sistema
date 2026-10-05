"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChartColumn,
  ClipboardList,
  HardDrive,
  Landmark,
  TrendingUp,
  BadgePercent,
  Ticket,
  History,
  LayoutDashboard,
  Megaphone,
  Menu,
  Receipt,
  Settings,
  Shirt,
  Store,
  Tags,
  Undo2,
  Upload,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import estilos from "./painel.module.css";

const ICONES: Record<string, LucideIcon> = {
  "": LayoutDashboard,
  pecas: Shirt,
  categorias: Tags,
  marketing: Megaphone,
  fornecedoras: Store,
  candidaturas: UserPlus,
  devolucoes: Undo2,
  pedidos: ClipboardList,
  clientes: Users,
  vendas: Receipt,
  historico: History,
  acertos: Wallet,
  relatorios: ChartColumn,
  financeiro: Landmark,
  indicadores: TrendingUp,
  promocoes: BadgePercent,
  cupons: Ticket,
  backup: HardDrive,
  equipe: UsersRound,
  configuracoes: Settings,
  importar: Upload,
};

/** As que vão na barra de baixo do celular (as do dia a dia), se a pessoa tiver acesso. */
const NA_BARRA = ["", "pecas", "pedidos", "vendas"];

export type ItemDoMenu = { chave: string; nome: string };

const endereco = (chave: string) => (chave ? `/painel/${chave}` : "/painel");

/**
 * Menu do painel: no computador, uma coluna fixa à esquerda com ícones; no
 * celular, uma barra de ícones no rodapé (Início, Peças, Pedidos, Vendas e
 * Menu), e "Menu" abre a lista completa.
 */
export function MenuDoPainel({ itens }: { itens: ItemDoMenu[] }) {
  const atual = usePathname();
  // A lista do celular fica aberta só na página em que foi aberta (fecha ao trocar de página).
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === atual;
  const setAberto = (abrir: boolean) => setAbertoEm(abrir ? atual : null);
  const ativo = (chave: string) => (chave ? atual === endereco(chave) || atual.startsWith(`${endereco(chave)}/`) : atual === "/painel");

  const link = (item: ItemDoMenu, classe?: string) => {
    const Icone = ICONES[item.chave] ?? LayoutDashboard;
    return (
      <Link
        key={item.chave}
        href={endereco(item.chave)}
        className={classe}
        aria-current={ativo(item.chave) ? "page" : undefined}
        onClick={() => setAberto(false)}
      >
        <Icone className="icone" aria-hidden />
        <span>{item.nome}</span>
      </Link>
    );
  };
  const naBarra = itens.filter((i) => NA_BARRA.includes(i.chave));
  const algumOutroAtivo = itens.some((i) => !NA_BARRA.includes(i.chave) && ativo(i.chave));

  return (
    <>
      <nav className={`${estilos.menu} ${aberto ? estilos.menuAberto : ""}`} aria-label="Painel" id="menu-painel">
        <div className={estilos.menuTopo}>
          <strong>Menu</strong>
          <button type="button" className={estilos.botaoIcone} onClick={() => setAberto(false)} aria-label="Fechar o menu">
            <X className="icone" aria-hidden />
          </button>
        </div>
        {itens.map((i) => link(i))}
      </nav>
      {aberto && <div className={estilos.fundoMenu} onClick={() => setAberto(false)} aria-hidden />}
      <nav className={estilos.barraCelular} aria-label="Atalhos do painel">
        {naBarra.map((i) => link({ ...i, nome: i.chave === "" ? "Início" : i.nome }))}
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          aria-controls="menu-painel"
          aria-current={algumOutroAtivo ? "page" : undefined}
        >
          <Menu className="icone" aria-hidden />
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
}
