import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, Camera, HandHeart, LogIn, MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { usuarioAtual } from "@/lib/acesso";
import { COOKIE_CARRINHO, lerCarrinho } from "@/lib/pedidos/regras";
import { destinoInicial } from "@/lib/permissoes";
import estilos from "./loja.module.css";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { lerLoja } from "@/lib/loja/servidor";
import { nomeComSlogan } from "@/lib/loja/regras";
import { paginasNoAr } from "@/lib/paginas/servidor";

// Parte pública do site: a vitrine e a página de cada peça.
export default async function LayoutLoja({ children }: LayoutProps<"/">) {
  const noCarrinho = lerCarrinho((await cookies()).get(COOKIE_CARRINHO)?.value).length;
  const usuario = await usuarioAtual();
  const loja = await lerLoja();
  const paginas = await paginasNoAr();
  return (
    <div className={estilos.estrutura}>
      <header className={estilos.topo}>
        <Link href="/" className={estilos.marca} aria-label={`${loja.nome} · início`}>
          <LogoDaLoja alt={nomeComSlogan(loja)} />
        </Link>
        <nav className={estilos.atalhos} aria-label="Sua conta">
          {usuario ? (
            <Link href={destinoInicial(usuario.perfis)} className={estilos.atalho}>
              <UserRound className="icone" aria-hidden />
              <span>{{ "/minha-conta": "Minha conta", "/fornecedora": "Minha área" }[destinoInicial(usuario.perfis)] ?? "Painel"}</span>
            </Link>
          ) : (
            <Link href="/entrar" className={estilos.atalho}>
              <UserRound className="icone" aria-hidden />
              <span>Entrar</span>
            </Link>
          )}
          <Link href="/carrinho" className={estilos.atalho} aria-label={`Carrinho${noCarrinho ? `, ${noCarrinho} peça(s)` : ""}`}>
            <span className={estilos.comContador}>
              <ShoppingBag className="icone" aria-hidden />
              {noCarrinho > 0 && <span className={estilos.contador}>{noCarrinho}</span>}
            </span>
            <span>Carrinho</span>
          </Link>
        </nav>
      </header>
      <main className={estilos.conteudo}>{children}</main>
      <footer className={estilos.rodape} data-rodape-escuro>
        <div className={estilos.rodapeConteudo}>
          <div className={estilos.rodapeMarca}>
            <strong>{loja.nome}</strong>
            {loja.slogan && <span>{loja.slogan}</span>}
            {loja.descricao && <p>{loja.descricao}</p>}
            <nav className={estilos.redes} aria-label="Fale com a loja">
              <a href={`https://wa.me/${loja.whatsapp}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="icone" aria-hidden />
                WhatsApp
              </a>
              {loja.instagram && (
                <a href={`https://instagram.com/${loja.instagram}`} target="_blank" rel="noopener noreferrer">
                  <Camera className="icone" aria-hidden />
                  Instagram
                </a>
              )}
            </nav>
            {paginas.length > 0 && (
              <nav className={estilos.linksRodape} aria-label="Informações">
                {paginas.map((p) => (
                  <Link key={p.endereco} href={p.endereco}>
                    {p.nome}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className={estilos.chamadaFornecedora}>
            <HandHeart className="icone" aria-hidden />
            <p className="sobretitulo">Para quem tem peças paradas</p>
            <h2>Seja uma fornecedora</h2>
            <p>Deixe as peças que não servem mais com a gente e ganhe com cada venda.</p>
            <Link href="/seja-fornecedora" className={estilos.botaoClaro}>
              Quero ser fornecedora
              <ArrowRight className="icone" aria-hidden />
            </Link>
          </div>
          <div className={estilos.chamadaArea}>
            <LogIn className="icone" aria-hidden />
            <p className="sobretitulo">Equipe e parceiras</p>
            <h2>Área da loja</h2>
            <p>Entrada da equipe, das fornecedoras e das clientes com conta.</p>
            <Link href="/entrar" className={estilos.botaoVazado}>
              Entrar
              <ArrowRight className="icone" aria-hidden />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
