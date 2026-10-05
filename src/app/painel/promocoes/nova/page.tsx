import type { Metadata } from "next";
import { Voltar } from "@/componentes/voltar";
import { exigirAcesso } from "@/lib/acesso";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import estilos from "../../painel.module.css";
import { FormularioPromocao } from "../formulario-promocao";

export const metadata: Metadata = { title: "Nova promoção" };

export default async function NovaPromocao() {
  await exigirAcesso("painel-administracao", "/painel/promocoes/nova");
  return (
    <>
      <Voltar href="/painel/promocoes">Promoções</Voltar>
      <h1 className={estilos.titulo}>Nova promoção</h1>
      <FormularioPromocao hoje={hojeEmSaoPaulo()} />
    </>
  );
}
