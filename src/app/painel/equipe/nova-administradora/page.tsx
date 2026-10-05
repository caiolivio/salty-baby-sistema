import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import estilos from "../../painel.module.css";
import { novaAdministradora } from "../acoes";
import { FormularioAdministradora } from "../formulario-administradora";
import { Voltar } from "@/componentes/voltar";

export const metadata: Metadata = { title: "Nova administradora" };

export default async function NovaAdministradora() {
  await exigirAcesso("painel-administracao", "/painel/equipe/nova-administradora");
  return (
    <>
      <p>
        <Voltar href="/painel/equipe">Equipe</Voltar>
      </p>
      <h1 className={estilos.titulo}>Nova administradora</h1>
      <p>
        Ela terá os mesmos poderes que você. Depois de salvar, aparece um link para ela criar a senha, que você manda pelo
        WhatsApp. Para alguém que só ajuda em algumas páginas, use &quot;Novo suporte&quot;.
      </p>
      <FormularioAdministradora acao={novaAdministradora} iniciais={{}} textoBotao="Cadastrar administradora" />
    </>
  );
}
