import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import estilos from "@/componentes/formulario.module.css";
import { existeAdministradora } from "@/lib/usuarios";
import { FormularioPrimeiroAcesso } from "./formulario-primeiro-acesso";
import { LogoDaLoja } from "@/componentes/logo-da-loja";

export const metadata: Metadata = { title: "Primeiro acesso" };

// Só aparece enquanto o sistema não tem nenhuma administradora.
export default async function PrimeiroAcesso() {
  await connection();
  if (await existeAdministradora()) redirect("/entrar");

  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <LogoDaLoja className={estilos.logo} largura={400} altura={400} />
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
