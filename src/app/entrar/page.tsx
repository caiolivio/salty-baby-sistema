import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import estilos from "@/componentes/formulario.module.css";
import { usuarioAtual } from "@/lib/acesso";
import { destinoInicial, enderecoDeVoltaSeguro } from "@/lib/permissoes";
import { existeAdministradora } from "@/lib/usuarios";
import { FormularioEntrar } from "./formulario-entrar";
import { LogoDaLoja } from "@/componentes/logo-da-loja";
import { Voltar } from "@/componentes/voltar";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const voltar = enderecoDeVoltaSeguro((await searchParams).voltar);

  const usuario = await usuarioAtual();
  if (usuario) redirect(voltar ?? destinoInicial(usuario.perfis));
  if (!(await existeAdministradora())) redirect("/primeiro-acesso");

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Voltar href="/">Voltar para a loja</Voltar>
        <Link href="/" className={estilos.logo}>
          <LogoDaLoja alt="Ir para a loja" largura={400} altura={400} />
        </Link>
        <h1 className={estilos.titulo}>Entrar</h1>
        <FormularioEntrar voltar={voltar} />
        <p className={estilos.rodape}>
          Ainda não tem conta?{" "}
          <Link href={voltar ? `/cadastro?voltar=${encodeURIComponent(voltar)}` : "/cadastro"}>Criar conta de cliente</Link>
        </p>
        <p className={estilos.rodape}>
          <Link href="/esqueci-senha">Esqueci a senha</Link>
        </p>
      </div>
    </main>
  );
}
