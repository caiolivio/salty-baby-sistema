import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import estilos from "@/componentes/formulario.module.css";
import { usuarioAtual } from "@/lib/acesso";
import { destinoInicial, enderecoDeVoltaSeguro } from "@/lib/permissoes";
import { existeAdministradora } from "@/lib/usuarios";
import { linkWhatsapp, WHATSAPP_LOJA } from "@/lib/vitrine";
import { FormularioEntrar } from "./formulario-entrar";

export const metadata: Metadata = { title: "Entrar · Salty Baby" };

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const voltar = enderecoDeVoltaSeguro((await searchParams).voltar);

  const usuario = await usuarioAtual();
  if (usuario) redirect(voltar ?? destinoInicial(usuario.perfis));
  if (!(await existeAdministradora())) redirect("/primeiro-acesso");
  // Sem envio de e-mail no sistema: a loja manda um link de nova senha pelo WhatsApp.
  const esqueci = linkWhatsapp(
    process.env.WHATSAPP_LOJA || WHATSAPP_LOJA,
    "Oi! Esqueci a senha da minha conta no site da Salty Baby. Pode me mandar um link para criar uma nova?",
  );

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Image className={estilos.logo} src="/marca/logo-salty-baby-400px.png" alt="Salty Baby" width={400} height={400} priority />
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
