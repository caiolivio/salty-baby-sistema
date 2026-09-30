import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { COOKIE_CARRINHO, lerCarrinho } from "@/lib/pedidos/regras";
import estilos from "./loja.module.css";

// Parte pública do site: a vitrine e a página de cada peça.
export default async function LayoutLoja({ children }: LayoutProps<"/">) {
  const noCarrinho = lerCarrinho((await cookies()).get(COOKIE_CARRINHO)?.value).length;
  return (
    <div className={estilos.estrutura}>
      <header className={estilos.topo}>
        <Link href="/" className={estilos.marca} aria-label="Salty Baby · início">
          <Image src="/marca/logo-salty-baby-400px.png" alt="Salty Baby · Moda Sustentável" width={400} height={218} priority />
        </Link>
        <Link href="/carrinho" className={estilos.linkCarrinho}>
          Carrinho
          {noCarrinho > 0 && <span className={estilos.contador}>{noCarrinho}</span>}
        </Link>
      </header>
      <main className={estilos.conteudo}>{children}</main>
      <footer className={estilos.rodape}>
        <p>Salty Baby · Moda Sustentável · Brechó infantil em Caraguatatuba-SP</p>
        <Link href="/entrar">Área da loja</Link>
      </footer>
    </div>
  );
}
