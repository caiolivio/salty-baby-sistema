import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import estilos from "@/componentes/formulario.module.css";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { Voltar } from "@/componentes/voltar";
import { usuarioAtual } from "@/lib/acesso";
import { envioDeEmailLigado } from "@/lib/contas/esqueci-senha-servidor";
import { novoDesafio } from "@/lib/desafio/servidor";
import { lerLoja } from "@/lib/loja/servidor";
import { destinoInicial } from "@/lib/permissoes";
import { linkWhatsapp } from "@/lib/vitrine";
import { FormularioEsqueci } from "./formulario-esqueci";

export const metadata: Metadata = { title: "Esqueci a senha", robots: { index: false } };

export default async function EsqueciSenha() {
  const usuario = await usuarioAtual();
  if (usuario) redirect(destinoInicial(usuario.perfis));
  const loja = await lerLoja();
  const whatsapp = linkWhatsapp(
    loja.whatsapp,
    `Oi! Esqueci a senha da minha conta no site da ${loja.nome}. Pode me mandar um link para criar uma nova?`,
  );
  const ligado = envioDeEmailLigado();

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Voltar href="/entrar">Voltar para entrar</Voltar>
        <Link href="/" className={estilos.logo}>
          <LogoDaLoja alt="Ir para a loja" />
        </Link>
        <h1 className={estilos.titulo}>Esqueci a senha</h1>
        {ligado ? (
          <>
            <p className={estilos.explicacao}>Digite o e-mail da sua conta. Vamos mandar um link para você criar uma senha nova.</p>
            <FormularioEsqueci desafio={await novoDesafio()} />
          </>
        ) : (
          <p className={estilos.explicacao}>O envio por e-mail ainda não está ligado. Peça um link novo à loja pelo WhatsApp.</p>
        )}
        {whatsapp && (
          <p className={estilos.rodape}>
            Prefere o WhatsApp?{" "}
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              Peça um link novo à loja
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
