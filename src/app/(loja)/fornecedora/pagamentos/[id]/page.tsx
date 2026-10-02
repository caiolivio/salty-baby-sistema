import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComprovanteAcerto } from "@/componentes/comprovante-acerto";
import { buscarAcerto } from "@/lib/acertos/gravar";
import { lerLoja } from "@/lib/loja/servidor";
import estilos from "../../../loja.module.css";
import { exigirFornecedoraLiberada } from "../../liberada";

export const metadata: Metadata = { title: "Comprovante de repasse", robots: { index: false } };

export default async function ComprovanteDaFornecedora({ params }: PageProps<"/fornecedora/pagamentos/[id]">) {
  const { id } = await params;
  const { fornecedora } = await exigirFornecedoraLiberada(`/fornecedora/pagamentos/${id}`);
  // Só abre o comprovante dela, e não um pagamento desfeito.
  const acerto = await buscarAcerto(id, fornecedora.id);
  if (!acerto) notFound();
  const loja = await lerLoja();
  return (
    <>
      <p>
        <Link href="/fornecedora/pagamentos">← Pagamentos</Link>
      </p>
      <h1 className={estilos.tituloPagina}>Comprovante nº {acerto.numero}</h1>
      <ComprovanteAcerto acerto={acerto} loja={loja.nome} />
    </>
  );
}
