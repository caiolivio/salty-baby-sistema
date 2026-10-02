import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import estilos from "@/componentes/formulario.module.css";
import { usuarioAtual } from "@/lib/acesso";
import { novoDesafio } from "@/lib/desafio/servidor";
import { destinoInicial, enderecoDeVoltaSeguro } from "@/lib/permissoes";
import { FormularioCadastro } from "./formulario-cadastro";
import { LogoDaLoja } from "@/componentes/logo-da-loja";

export const metadata: Metadata = { title: "Criar conta" };

export default async function Cadastro({ searchParams }: PageProps<"/cadastro">) {
  const voltar = enderecoDeVoltaSeguro((await searchParams).voltar);
  const usuario = await usuarioAtual();
  if (usuario) redirect(voltar ?? destinoInicial(usuario.perfis));

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Link href="/" className={estilos.logo}>
          <LogoDaLoja alt="Voltar ao início" />
        </Link>
        <h1 className={estilos.titulo}>Criar conta</h1>
        <p className={estilos.explicacao}>
          Com a conta você vê suas compras, guarda peças favoritas e recebe sugestões no tamanho certo.
        </p>
        <FormularioCadastro voltar={voltar} desafio={await novoDesafio()} />
        <p className={estilos.rodape}>
          Já tem conta? <Link href={voltar ? `/entrar?voltar=${encodeURIComponent(voltar)}` : "/entrar"}>Entrar</Link>
        </p>
      </div>
    </main>
  );
}
