import Image from "next/image";
import Link from "next/link";
import estilos from "./loja.module.css";

// Parte pública do site: a vitrine e a página de cada peça.
export default function LayoutLoja({ children }: LayoutProps<"/">) {
  return (
    <div className={estilos.estrutura}>
      <header className={estilos.topo}>
        <Link href="/" className={estilos.marca} aria-label="Salty Baby · início">
          <Image src="/marca/logo-salty-baby-400px.png" alt="Salty Baby · Moda Sustentável" width={400} height={218} priority />
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
