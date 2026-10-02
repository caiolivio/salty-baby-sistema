"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import estilos from "../loja.module.css";

const ABAS = [
  { href: "/fornecedora", nome: "Resumo" },
  { href: "/fornecedora/pecas", nome: "Minhas peças" },
  { href: "/fornecedora/vendas", nome: "Vendas" },
  { href: "/fornecedora/enviar", nome: "Enviar peças" },
  { href: "/fornecedora/dados", nome: "Meus dados" },
];

export function AbasDaFornecedora() {
  const atual = usePathname();
  return (
    <nav className={estilos.abas} aria-label="Área da fornecedora">
      {ABAS.map((a) => (
        <Link key={a.href} href={a.href} aria-current={atual === a.href ? "page" : undefined}>
          {a.nome}
        </Link>
      ))}
    </nav>
  );
}
