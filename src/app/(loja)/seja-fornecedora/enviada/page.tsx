import type { Metadata } from "next";
import Link from "next/link";
import { Passos } from "@/componentes/passos";
import { PASSOS, situacaoDosPassos } from "@/lib/fornecedoras/candidatura";
import estilos from "../../loja.module.css";

export const metadata: Metadata = { title: "Inscrição enviada · Salty Baby", robots: { index: false } };

export default function InscricaoEnviada() {
  return (
    <div className={estilos.paginaFornecedora}>
      <h1 className={estilos.tituloPagina}>Inscrição enviada!</h1>
      <Passos nomes={PASSOS} situacoes={situacaoDosPassos(1, true)} />
      <section className={estilos.explicacao}>
        <p>
          Obrigada por querer fazer parte da Salty Baby! 💛 Recebemos seus dados e as fotos das peças.
        </p>
        <p>
          Agora a nossa <strong>curadoria</strong> vai avaliar as peças. <strong>A Salty entra em contato pelo WhatsApp</strong>{" "}
          para contar o resultado e, se aprovado, mandar o link de acesso à sua área, onde você faz o passo 2.
        </p>
        <p>
          <Link href="/">Voltar para a vitrine</Link>
        </p>
      </section>
    </div>
  );
}
