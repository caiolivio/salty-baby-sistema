"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutDashboard, ReceiptText } from "lucide-react";
import estilos from "./financeiro.module.css";

const ABAS = [
  { href: "/painel/financeiro", nome: "Resumo do mês", Icone: LayoutDashboard },
  { href: "/painel/financeiro/despesas", nome: "Despesas", Icone: ReceiptText },
  { href: "/painel/financeiro/taxas", nome: "Taxas de pagamento", Icone: CreditCard },
];

/** As três páginas do Financeiro, levando o mês escolhido de uma para outra. */
export function AbasDoFinanceiro({ mes }: { mes: string }) {
  const atual = usePathname();
  return (
    <nav className={estilos.abas} aria-label="Financeiro">
      {ABAS.map((a) => (
        <Link key={a.href} href={`${a.href}?mes=${mes}`} aria-current={atual === a.href ? "page" : undefined}>
          <a.Icone className="icone" aria-hidden />
          {a.nome}
        </Link>
      ))}
    </nav>
  );
}
