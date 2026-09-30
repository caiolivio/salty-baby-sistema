import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import estilos from "@/componentes/formulario.module.css";
import { existeAdministradora } from "@/lib/usuarios";
import { FormularioPrimeiroAcesso } from "./formulario-primeiro-acesso";

export const metadata: Metadata = { title: "Primeiro acesso · Salty Baby" };

// Só aparece enquanto o sistema não tem nenhuma administradora.
export default async function PrimeiroAcesso() {
  await connection();
  if (await existeAdministradora()) redirect("/entrar");

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Image className={estilos.logo} src="/marca/logo-salty-baby-400px.png" alt="Salty Baby" width={400} height={400} priority />
        <h1 className={estilos.titulo}>Primeiro acesso</h1>
        <p className={estilos.explicacao}>
          Crie a conta da administradora. Esta página só funciona uma vez: depois disso, novos usuários são
          cadastrados pelo painel.
        </p>
        <FormularioPrimeiroAcesso />
      </div>
    </main>
  );
}
