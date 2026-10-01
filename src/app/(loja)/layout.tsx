import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { usuarioAtual } from "@/lib/acesso";
import { COOKIE_CARRINHO, lerCarrinho } from "@/lib/pedidos/regras";
import { destinoInicial } from "@/lib/permissoes";
import estilos from "./loja.module.css";

// Parte pública do site: a vitrine e a página de cada peça.
export default async function LayoutLoja({ children }: LayoutProps<"/">) {
  const noCarrinho = lerCarrinho((await cookies()).get(COOKIE_CARRINHO)?.value).length;
  const usuario = await usuarioAtual();
  return (
    <div className={estilos.estrutura}>
      <header className={estilos.topo}>
        <Link href="/" className={estilos.marca} aria-label="Salty Baby · início">
          <Image src="/marca/logo-salty-baby-400px.png" alt="Salty Baby · Moda Sustentável" width={400} height={218} priority />
        </Link>
        <nav className={estilos.atalhos} aria-label="Sua conta">
          {usuario ? (
            <Link href={destinoInicial(usuario.perfis)} className={estilos.linkConta}>
              {{ "/minha-conta": "Minha conta", "/fornecedora": "Minha área" }[destinoInicial(usuario.perfis)] ?? "Painel"}
            </Link>
          ) : (
            <Link href="/entrar" className={estilos.linkConta}>
              Entrar
            </Link>
          )}
          <Link href="/carrinho" className={estilos.linkCarrinho}>
            Carrinho
            {noCarrinho > 0 && <span className={estilos.contador}>{noCarrinho}</span>}
          </Link>
        </nav>
      </header>
      <main className={estilos.conteudo}>{children}</main>
      <footer className={estilos.rodape}>
        <p>Salty Baby · Moda Sustentável · Brechó infantil em Caraguatatuba-SP</p>
        <nav className={estilos.linksRodape} aria-label="Links do rodapé">
          <Link href="/seja-fornecedora">Seja uma fornecedora</Link>
          <Link href="/entrar">Área da loja</Link>
        </nav>
      </footer>
    </div>
  );
}
