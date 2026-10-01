import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import estilos from "@/componentes/formulario.module.css";
import { usuarioAtual } from "@/lib/acesso";
import { destinoInicial, enderecoDeVoltaSeguro } from "@/lib/permissoes";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta · Salty Baby" };

export default async function Cadastro({ searchParams }: PageProps<"/cadastro">) {
  const voltar = enderecoDeVoltaSeguro((await searchParams).voltar);
  const usuario = await usuarioAtual();
  if (usuario) redirect(voltar ?? destinoInicial(usuario.perfis));

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Link href="/" className={estilos.logo}>
          <Image src="/marca/logo-salty-baby-400px.png" alt="Salty Baby · início" width={400} height={218} priority />
        </Link>
        <h1 className={estilos.titulo}>Criar conta</h1>
        <p className={estilos.explicacao}>
          Com a conta você vê suas compras, guarda peças favoritas e recebe sugestões no tamanho certo.
        </p>
        <FormularioCadastro voltar={voltar} />
        <p className={estilos.rodape}>
          Já tem conta? <Link href={voltar ? `/entrar?voltar=${encodeURIComponent(voltar)}` : "/entrar"}>Entrar</Link>
        </p>
      </div>
    </main>
  );
}
