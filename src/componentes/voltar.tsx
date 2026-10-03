import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/** Link de voltar (ex.: "← Peças"), com a seta em ícone. */
export function Voltar({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="linkSeta">
      <ArrowLeft className="icone" aria-hidden />
      {children}
    </Link>
  );
}

/** Link de seguir (ex.: "Próximas →"), com a seta em ícone. */
export function Seguir({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="linkSeta">
      {children}
      <ArrowRight className="icone" aria-hidden />
    </Link>
  );
}
