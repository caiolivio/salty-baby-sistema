import type { Metadata } from "next";
import Link from "next/link";
import estilos from "@/componentes/formulario.module.css";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Sem acesso" };

export default async function SemAcesso() {
  const loja = await lerLoja();
  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <h1 className={estilos.titulo}>Você não tem acesso a esta página</h1>
        <p className={estilos.explicacao}>
          Se precisar de acesso, peça para a administradora da {loja.nome} liberar no seu cadastro.
        </p>
        <p className={estilos.rodape}>
          <Link href="/">Voltar para o início</Link>
        </p>
      </div>
    </main>
  );
}
