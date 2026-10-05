"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, Heart, Package, Receipt, ShoppingBag, Sparkles, UserRound } from "lucide-react";
import estilos from "../loja.module.css";

const ABAS = [
  { href: "/minha-conta", nome: "Para você", Icone: Sparkles },
  { href: "/minha-conta/compras", nome: "Compras", Icone: Receipt },
  { href: "/minha-conta/sacolinha", nome: "Sacolinha", Icone: Package },
  { href: "/minha-conta/favoritos", nome: "Favoritos", Icone: Heart },
  { href: "/minha-conta/avisos", nome: "Avisos", Icone: BellRing },
  { href: "/carrinho", nome: "Carrinho", Icone: ShoppingBag },
  { href: "/minha-conta/perfil", nome: "Meus dados", Icone: UserRound },
];

export function Abas() {
  const atual = usePathname();
  return (
    <nav className={estilos.abas} aria-label="Minha conta">
      {ABAS.map((a) => (
        <Link key={a.href} href={a.href} aria-current={atual === a.href ? "page" : undefined}>
          <a.Icone className="icone" aria-hidden />
          {a.nome}
        </Link>
      ))}
    </nav>
  );
}
