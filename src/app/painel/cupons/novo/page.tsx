import type { Metadata } from "next";
import { Voltar } from "@/componentes/voltar";
import { exigirAcesso } from "@/lib/acesso";
import estilos from "../../painel.module.css";
import { FormularioCupom } from "../formulario-cupom";
import { opcoesDoCupom } from "../opcoes";

export const metadata: Metadata = { title: "Novo cupom" };

export default async function NovoCupom() {
  await exigirAcesso("painel-administracao", "/painel/cupons/novo");
  const opcoes = await opcoesDoCupom();
  return (
    <>
      <Voltar href="/painel/cupons">Cupons</Voltar>
      <h1 className={estilos.titulo}>Novo cupom</h1>
      <FormularioCupom {...opcoes} />
    </>
  );
}
