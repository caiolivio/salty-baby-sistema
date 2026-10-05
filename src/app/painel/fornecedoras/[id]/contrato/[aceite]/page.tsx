import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TextoDaPagina } from "@/componentes/texto-da-pagina";
import { Voltar } from "@/componentes/voltar";
import { exigirAcesso } from "@/lib/acesso";
import { formatarDataHora } from "@/lib/datas";
import { aceitePorId } from "@/lib/fornecedoras/aceite";
import { conteudoGuardado } from "@/lib/fornecedoras/contrato";
import { blocosDoTexto } from "@/lib/paginas/regras";
import estilos from "../../../../painel.module.css";
import proprios from "../../../../formulario.module.css";

export const metadata: Metadata = { title: "Contrato aceito" };

/** O texto exato que a fornecedora aceitou (só a administradora). */
export default async function ContratoAceito({ params }: PageProps<"/painel/fornecedoras/[id]/contrato/[aceite]">) {
  const { id, aceite: aceiteId } = await params;
  const usuario = await exigirAcesso("painel", `/painel/fornecedoras/${id}/contrato/${aceiteId}`);
  if (!usuario.acesso.administradora) notFound();
  const aceite = await aceitePorId(aceiteId);
  if (!aceite || aceite.fornecedoraId !== id) notFound();
  const titulo = aceite.texto.split("\n")[0];
  return (
    <>
      <p>
        <Voltar href={`/painel/fornecedoras/${id}`}>Fornecedora</Voltar>
      </p>
      <h1 className={estilos.titulo}>{titulo}</h1>
      <p className={proprios.dica}>
        Versão {aceite.versao}, aceita por {aceite.nome} em {formatarDataHora(aceite.aceitoEm)}. Código do texto (SHA-256):{" "}
        {aceite.hash}
      </p>
      <TextoDaPagina blocos={blocosDoTexto(conteudoGuardado(aceite.texto))} nivel={3} />
    </>
  );
}
