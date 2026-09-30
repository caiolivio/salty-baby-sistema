import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import estilos from "@/componentes/formulario.module.css";

export const metadata: Metadata = { title: "Página não encontrada · Salty Baby" };

export default function NaoEncontrada() {
  return (
    <main className={estilos.pagina}>
      <div className={estilos.cartao}>
        <Image src="/marca/icone-salty-baby.png" alt="" width={80} height={80} className={estilos.logo} />
        <h1 className={estilos.titulo}>Página não encontrada</h1>
        <p className={estilos.explicacao}>Confira o endereço. Ele não leva acento nem letra maiúscula.</p>
        <p className={estilos.rodape}>
          <Link href="/painel">Ir para o painel</Link>
        </p>
      </div>
    </main>
  );
}
