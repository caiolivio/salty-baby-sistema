"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, CircleDollarSign, LayoutDashboard, Receipt, Shirt, Upload, UserRound } from "lucide-react";
import estilos from "../loja.module.css";

const ABAS = [
  { href: "/fornecedora", nome: "Resumo", Icone: LayoutDashboard },
  { href: "/fornecedora/pecas", nome: "Minhas peças", Icone: Shirt },
  { href: "/fornecedora/vendas", nome: "Vendas", Icone: Receipt },
  { href: "/fornecedora/pagamentos", nome: "Pagamentos", Icone: CircleDollarSign },
  { href: "/fornecedora/relatorios", nome: "Relatórios", Icone: ChartColumn },
  { href: "/fornecedora/enviar", nome: "Enviar peças", Icone: Upload },
  { href: "/fornecedora/dados", nome: "Meus dados", Icone: UserRound },
];

export function AbasDaFornecedora() {
  const atual = usePathname();
  return (
    <nav className={estilos.abas} aria-label="Área da fornecedora">
      {ABAS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          aria-current={atual === a.href || (a.href !== "/fornecedora" && atual.startsWith(`${a.href}/`)) ? "page" : undefined}
        >
          <a.Icone className="icone" aria-hidden />
          {a.nome}
        </Link>
      ))}
    </nav>
  );
}
