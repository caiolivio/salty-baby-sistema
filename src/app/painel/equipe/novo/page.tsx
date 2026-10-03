import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import estilos from "../../painel.module.css";
import { novoSuporte } from "../acoes";
import { FormularioSuporte } from "../formulario-suporte";
import { Voltar } from "@/componentes/voltar";

export const metadata: Metadata = { title: "Novo suporte" };

export default async function NovoSuporte() {
  await exigirAcesso("painel-administracao", "/painel/equipe/novo");
  return (
    <>
      <p>
        <Voltar href="/painel/equipe">Equipe</Voltar>
      </p>
      <h1 className={estilos.titulo}>Novo suporte</h1>
      <p>
        Escolha o que a pessoa pode usar. Depois de salvar, aparece um link para ela criar a senha, que você manda pelo
        WhatsApp.
      </p>
      <FormularioSuporte acao={novoSuporte} iniciais={{}} textoBotao="Cadastrar suporte" />
    </>
  );
}
