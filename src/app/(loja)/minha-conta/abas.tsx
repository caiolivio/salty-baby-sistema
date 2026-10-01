"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import estilos from "../loja.module.css";

const ABAS = [
  { href: "/minha-conta", nome: "Para você" },
  { href: "/minha-conta/compras", nome: "Compras" },
  { href: "/minha-conta/favoritos", nome: "Favoritos" },
  { href: "/carrinho", nome: "Carrinho" },
  { href: "/minha-conta/perfil", nome: "Meus dados" },
];

export function Abas() {
  const atual = usePathname();
  return (
    <nav className={estilos.abas} aria-label="Minha conta">
      {ABAS.map((a) => (
        <Link key={a.href} href={a.href} aria-current={atual === a.href ? "page" : undefined}>
          {a.nome}
        </Link>
      ))}
    </nav>
  );
}
