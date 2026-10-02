import type { Metadata, Viewport } from "next";
import { cssDasCores, nomeComSlogan } from "@/lib/loja/regras";
import { imagensDaLoja, lerLoja } from "@/lib/loja/servidor";
import "./globals.css";

// Nome, cores e ícone vêm das configurações da loja (/painel/configuracoes).
// Cada página escreve só o próprio título ("Peças"); o nome da loja entra aqui.
export async function generateMetadata(): Promise<Metadata> {
  const loja = await lerLoja();
  const { icone } = imagensDaLoja(loja);
  return {
    title: { default: nomeComSlogan(loja), template: `%s · ${loja.nome}` },
    description: loja.descricao ?? loja.nome,
    icons: { icon: icone, apple: icone },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const loja = await lerLoja();
  return { themeColor: loja.corPrincipal };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const loja = await lerLoja();
  return (
    <html lang="pt-BR">
      <head>
        <style>{cssDasCores(loja)}</style>
      </head>
      <body>
        {children}
        {/* Crédito do desenvolvimento, em todas as páginas do sistema (fica de fora na impressão). */}
        <footer className="creditos">
          Desenvolvido por:{" "}
          <a href="http://people9.com.br/" target="_blank" rel="noopener">
            People9 Comunicação
          </a>
        </footer>
      </body>
    </html>
  );
}
