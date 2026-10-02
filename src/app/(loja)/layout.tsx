import { cookies } from "next/headers";
import Link from "next/link";
import { usuarioAtual } from "@/lib/acesso";
import { COOKIE_CARRINHO, lerCarrinho } from "@/lib/pedidos/regras";
import { destinoInicial } from "@/lib/permissoes";
import estilos from "./loja.module.css";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { lerLoja } from "@/lib/loja/servidor";
import { nomeComSlogan } from "@/lib/loja/regras";

// Parte pública do site: a vitrine e a página de cada peça.
export default async function LayoutLoja({ children }: LayoutProps<"/">) {
  const noCarrinho = lerCarrinho((await cookies()).get(COOKIE_CARRINHO)?.value).length;
  const usuario = await usuarioAtual();
  const loja = await lerLoja();
  return (
    <div className={estilos.estrutura}>
      <header className={estilos.topo}>
        <Link href="/" className={estilos.marca} aria-label={`${loja.nome} · início`}>
          <LogoDaLoja alt={nomeComSlogan(loja)} />
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
        <p>{[loja.nome, loja.slogan, loja.descricao].filter(Boolean).join(" · ")}</p>
        <nav className={estilos.linksRodape} aria-label="Links do rodapé">
          <Link href="/seja-fornecedora">Seja uma fornecedora</Link>
          <Link href="/entrar">Área da loja</Link>
          {loja.instagram && (
            <a href={`https://instagram.com/${loja.instagram}`} target="_blank" rel="noopener">
              Instagram
            </a>
          )}
        </nav>
      </footer>
    </div>
  );
}
