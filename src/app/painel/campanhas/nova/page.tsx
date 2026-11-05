import type { Metadata } from "next";
import { Voltar } from "@/componentes/voltar";
import { exigirAcesso } from "@/lib/acesso";
import estilos from "../../painel.module.css";
import { FormularioCampanha } from "../formulario-campanha";

export const metadata: Metadata = { title: "Nova campanha" };

export default async function NovaCampanha() {
  await exigirAcesso("painel-administracao", "/painel/campanhas/nova");
  return (
    <>
      <Voltar href="/painel/campanhas">Campanhas</Voltar>
      <h1 className={estilos.titulo}>Nova campanha</h1>
      <FormularioCampanha />
    </>
  );
}
