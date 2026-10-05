"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  BadgePercent,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  HardDrive,
  History,
  Landmark,
  LayoutDashboard,
  Megaphone,
  Menu,
  PiggyBank,
  Receipt,
  Settings,
  ShoppingBag,
  Shirt,
  SlidersHorizontal,
  Store,
  Tags,
  Ticket,
  TrendingUp,
  Undo2,
  Upload,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { grupoDaPagina, type ItemDoMenu, type LinkDoMenu } from "@/lib/painel/menu";
import estilos from "./painel.module.css";

const ICONES: Record<string, LucideIcon> = {
  "": LayoutDashboard,
  financas: PiggyBank,
  financeiro: Landmark,
  acertos: Wallet,
  indicadores: TrendingUp,
  relatorios: ChartColumn,
  pecas: Shirt,
  categorias: Tags,
  devolucoes: Undo2,
  pedidos: ClipboardList,
  vendas: Receipt,
  clientes: Users,
  sacolinhas: ShoppingBag,
  promocoes: BadgePercent,
  cupons: Ticket,
  marketing: Megaphone,
  fornecedoras: Store,
  candidaturas: UserPlus,
  paginas: FileText,
  historico: History,
  configuracao: Settings,
  configuracoes: SlidersHorizontal,
  equipe: UsersRound,
  backup: HardDrive,
  importar: Upload,
};

/** As que vão na barra de baixo do celular (as do dia a dia), se a pessoa tiver acesso. */
const NA_BARRA = ["", "pecas", "pedidos", "vendas"];

const endereco = (chave: string) => (chave ? `/painel/${chave}` : "/painel");

/**
 * Menu do painel: no computador, uma coluna fixa à esquerda com ícones; no
 * celular, uma barra de ícones no rodapé (Início, Peças, Pedidos, Vendas e
 * Menu), e "Menu" abre a lista completa. Os grupos (Finanças, Configurações)
 * abrem a lista das páginas ao tocar; no computador, também ao passar o mouse.
 */
export function MenuDoPainel({ itens }: { itens: ItemDoMenu[] }) {
  const atual = usePathname();
  // A lista do celular fica aberta só na página em que foi aberta (fecha ao trocar de página).
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === atual;
  const setAberto = (abrir: boolean) => setAbertoEm(abrir ? atual : null);
  const ativo = (chave: string) => (chave ? atual === endereco(chave) || atual.startsWith(`${endereco(chave)}/`) : atual === "/painel");
  const grupoAtual = grupoDaPagina(itens, atual)?.chave;
  // Grupos abertos na própria coluna (o da página aberta já vem aberto).
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const expandido = (chave: string) => expandidos[chave] ?? chave === grupoAtual;
  // Submenu ao passar o mouse (computador): o grupo e a altura dele na tela.
  const [flutuante, setFlutuante] = useState<{ chave: string; topo: number; esquerda: number } | null>(null);
  const fechar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segurar = () => {
    if (fechar.current) clearTimeout(fechar.current);
  };
  const soltar = () => {
    segurar();
    fechar.current = setTimeout(() => setFlutuante(null), 150);
  };
  const comMouse = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (min-width: 901px)").matches;

  const link = (item: LinkDoMenu, classe?: string) => {
    const Icone = ICONES[item.chave] ?? LayoutDashboard;
    return (
      <Link
        key={item.chave}
        href={endereco(item.chave)}
        className={classe}
        aria-current={ativo(item.chave) ? "page" : undefined}
        onClick={() => {
          setAberto(false);
          setFlutuante(null);
        }}
      >
        <Icone className="icone" aria-hidden />
        <span>{item.nome}</span>
      </Link>
    );
  };

  const grupo = (item: ItemDoMenu & { filhos: LinkDoMenu[] }) => {
    const Icone = ICONES[item.chave] ?? LayoutDashboard;
    const abertoAqui = expandido(item.chave);
    const temAtivo = item.filhos.some((f) => ativo(f.chave));
    return (
      <div
        key={item.chave}
        className={estilos.grupoMenu}
        onMouseEnter={(e) => {
          if (!comMouse() || abertoAqui) return;
          segurar();
          const caixa = e.currentTarget.getBoundingClientRect();
          setFlutuante({ chave: item.chave, topo: caixa.top, esquerda: caixa.right });
        }}
        onMouseLeave={soltar}
      >
        <button
          type="button"
          className={estilos.botaoGrupo}
          aria-expanded={abertoAqui}
          data-ativo={temAtivo || undefined}
          onClick={(e) => {
            setFlutuante(null);
            setExpandidos((x) => ({ ...x, [item.chave]: !abertoAqui }));
            // No celular, o grupo aberto pode ficar abaixo da tela: rola até ele.
            const grupo = e.currentTarget.parentElement;
            if (!abertoAqui) requestAnimationFrame(() => grupo?.scrollIntoView({ block: "nearest" }));
          }}
        >
          <Icone className="icone" aria-hidden />
          <span>{item.nome}</span>
          {abertoAqui ? (
            <ChevronDown className={`icone ${estilos.seta}`} aria-hidden />
          ) : (
            <ChevronRight className={`icone ${estilos.seta}`} aria-hidden />
          )}
        </button>
        {abertoAqui && <div className={estilos.subMenu}>{item.filhos.map((f) => link(f))}</div>}
      </div>
    );
  };

  const naBarra = itens.filter((i) => NA_BARRA.includes(i.chave));
  const algumOutroAtivo = itens.some(
    (i) => !NA_BARRA.includes(i.chave) && (i.filhos ? i.filhos.some((f) => ativo(f.chave)) : ativo(i.chave)),
  );
  const doFlutuante = flutuante ? itens.find((i) => i.chave === flutuante.chave) : undefined;

  return (
    <>
      <nav className={`${estilos.menu} ${aberto ? estilos.menuAberto : ""}`} aria-label="Painel" id="menu-painel">
        <div className={estilos.menuTopo}>
          <strong>Menu</strong>
          <button type="button" className={estilos.botaoIcone} onClick={() => setAberto(false)} aria-label="Fechar o menu">
            <X className="icone" aria-hidden />
          </button>
        </div>
        {itens.map((i) => (i.filhos ? grupo({ ...i, filhos: i.filhos }) : link(i)))}
      </nav>
      {doFlutuante?.filhos && flutuante && (
        <div
          className={estilos.menuFlutuante}
          style={{ top: flutuante.topo, left: flutuante.esquerda }}
          onMouseEnter={segurar}
          onMouseLeave={soltar}
          role="menu"
          aria-label={doFlutuante.nome}
        >
          <strong>{doFlutuante.nome}</strong>
          {doFlutuante.filhos.map((f) => link(f))}
        </div>
      )}
      {aberto && <div className={estilos.fundoMenu} onClick={() => setAberto(false)} aria-hidden />}
      <nav className={estilos.barraCelular} aria-label="Atalhos do painel">
        {naBarra.map((i) => link(i))}
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

/** Abas no alto das páginas de um grupo (Finanças, Configurações), para ir de uma à outra. */
export function AbasDoGrupo({ itens }: { itens: ItemDoMenu[] }) {
  const atual = usePathname();
  const grupo = grupoDaPagina(itens, atual);
  if (!grupo?.filhos || grupo.filhos.length < 2) return null;
  return (
    <nav className={estilos.abasDoGrupo} aria-label={grupo.nome}>
      {grupo.filhos.map((f) => {
        const Icone = ICONES[f.chave] ?? LayoutDashboard;
        const aqui = atual === endereco(f.chave) || atual.startsWith(`${endereco(f.chave)}/`);
        return (
          <Link key={f.chave} href={endereco(f.chave)} aria-current={aqui ? "page" : undefined}>
            <Icone className="icone" aria-hidden />
            {f.nome}
          </Link>
        );
      })}
    </nav>
  );
}
