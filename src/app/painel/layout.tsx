import Image from "next/image";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { sair } from "./acoes";
import estilos from "./painel.module.css";

// Toda página dentro de /painel passa por aqui: sem login ou sem perfil de
// administradora/ajudante, a pessoa não vê nada.
export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const usuario = await exigirAcesso("painel", "/painel");

  return (
    <div className={estilos.estrutura}>
      <header className={estilos.topo}>
        <Link href="/painel" className={estilos.marca}>
          <Image src="/marca/icone-salty-baby.png" alt="" width={40} height={40} className={estilos.logo} />
          <span>Salty Baby · Painel</span>
        </Link>
        <div className={estilos.usuario}>
          <span>{usuario.nome}</span>
          <form action={sair}>
            <button type="submit" className={estilos.sair}>
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className={estilos.conteudo}>{children}</main>
    </div>
  );
}
