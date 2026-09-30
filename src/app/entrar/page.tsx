import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import estilos from "@/componentes/formulario.module.css";
import { usuarioAtual } from "@/lib/acesso";
import { destinoInicial, enderecoDeVoltaSeguro } from "@/lib/permissoes";
import { existeAdministradora } from "@/lib/usuarios";
import { FormularioEntrar } from "./formulario-entrar";

export const metadata: Metadata = { title: "Entrar · Salty Baby" };

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const voltar = enderecoDeVoltaSeguro((await searchParams).voltar);

  const usuario = await usuarioAtual();
  if (usuario) redirect(voltar ?? destinoInicial(usuario.perfis));
  if (!(await existeAdministradora())) redirect("/primeiro-acesso");

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Image className={estilos.logo} src="/marca/logo-salty-baby-400px.png" alt="Salty Baby" width={400} height={400} priority />
        <h1 className={estilos.titulo}>Entrar</h1>
        <FormularioEntrar voltar={voltar} />
      </div>
    </main>
  );
}
