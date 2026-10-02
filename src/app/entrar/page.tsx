import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import estilos from "@/componentes/formulario.module.css";
import { usuarioAtual } from "@/lib/acesso";
import { destinoInicial, enderecoDeVoltaSeguro } from "@/lib/permissoes";
import { existeAdministradora } from "@/lib/usuarios";
import { linkWhatsapp } from "@/lib/vitrine";
import { FormularioEntrar } from "./formulario-entrar";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const voltar = enderecoDeVoltaSeguro((await searchParams).voltar);

  const usuario = await usuarioAtual();
  if (usuario) redirect(voltar ?? destinoInicial(usuario.perfis));
  if (!(await existeAdministradora())) redirect("/primeiro-acesso");
  // Sem envio de e-mail no sistema: a loja manda um link de nova senha pelo WhatsApp.
  const loja = await lerLoja();
  const esqueci = linkWhatsapp(
    loja.whatsapp,
    `Oi! Esqueci a senha da minha conta no site da ${loja.nome}. Pode me mandar um link para criar uma nova?`,
  );

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <LogoDaLoja className={estilos.logo} largura={400} altura={400} />
        <h1 className={estilos.titulo}>Entrar</h1>
        <FormularioEntrar voltar={voltar} />
        <p className={estilos.rodape}>
          Ainda não tem conta?{" "}
          <Link href={voltar ? `/cadastro?voltar=${encodeURIComponent(voltar)}` : "/cadastro"}>Criar conta de cliente</Link>
        </p>
        {esqueci && (
          <p className={estilos.rodape}>
            Esqueceu a senha?{" "}
            <a href={esqueci} target="_blank" rel="noopener noreferrer">
              Peça um link novo à loja no WhatsApp
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
