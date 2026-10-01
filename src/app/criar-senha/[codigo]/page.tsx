import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import estilos from "@/componentes/formulario.module.css";
import { codigoValido } from "@/lib/clientes/conta";
import { buscarLinkDeSenha } from "@/lib/clientes/contas";
import { FormularioCriarSenha } from "./formulario-criar-senha";

export const metadata: Metadata = { title: "Criar senha · Salty Baby", robots: { index: false } };

export default async function CriarSenha({ params }: PageProps<"/criar-senha/[codigo]">) {
  const { codigo } = await params;
  const usuario = codigoValido(codigo) ? await buscarLinkDeSenha(codigo) : null;

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Link href="/" className={estilos.logo}>
          <Image src="/marca/logo-salty-baby-400px.png" alt="Salty Baby · início" width={400} height={218} priority />
        </Link>
        {usuario ? (
          <>
            <h1 className={estilos.titulo}>Crie sua senha</h1>
            <p className={estilos.explicacao}>
              Olá, {usuario.nome.split(" ")[0]}! Sua conta é o e-mail <strong>{usuario.email}</strong>. Escolha uma senha para
              entrar.
            </p>
            <FormularioCriarSenha codigo={codigo} />
          </>
        ) : (
          <>
            <h1 className={estilos.titulo}>Este link não vale mais</h1>
            <p className={estilos.explicacao}>
              O link já foi usado ou passou do prazo. Peça um novo à loja pelo WhatsApp, ou entre com a senha que você já criou.
            </p>
            <p className={estilos.rodape}>
              <Link href="/entrar">Entrar</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
