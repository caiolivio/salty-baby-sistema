import Image from "next/image";
import { connection } from "next/server";
import { verificarBanco } from "@/lib/banco";
import styles from "./page.module.css";

export default async function Inicio() {
  await connection();
  const banco = await verificarBanco();

  return (
    <main className={styles.pagina}>
      <Image
        className={styles.logo}
        src="/marca/logo-salty-baby-400px.png"
        alt="Salty Baby · Moda Sustentável"
        width={400}
        height={400}
        priority
      />
      <h1 className={styles.titulo}>Estamos preparando a nova loja</h1>
      <p className={styles.texto}>
        Em breve você vai poder ver todas as peças, montar seu pedido e falar com a gente pelo WhatsApp por aqui.
      </p>
      <p className={styles.situacao} role="status">
        <span className={`${styles.ponto} ${banco.conectado ? styles.ok : styles.falha}`} aria-hidden />
        {banco.conectado ? "Banco de dados conectado" : `Banco de dados sem conexão (${banco.motivo})`}
      </p>
    </main>
  );
}
