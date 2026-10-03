import type { Metadata } from "next";
import { exigirPagina } from "@/lib/acesso";
import { podeAcessar } from "@/lib/permissoes";
import estilos from "../../painel.module.css";
import { novaCliente } from "../acoes";
import { FormularioCliente } from "../formulario-cliente";
import { Voltar } from "@/componentes/voltar";

export const metadata: Metadata = { title: "Nova cliente" };

export default async function NovaCliente() {
  const usuario = await exigirPagina("clientes", "alterar", "/painel/clientes/nova");
  return (
    <>
      <p>
        <Voltar href="/painel/clientes">Clientes</Voltar>
      </p>
      <h1 className={estilos.titulo}>Nova cliente</h1>
      <FormularioCliente
        acao={novaCliente}
        iniciais={{}}
        textoBotao="Cadastrar cliente"
        voltar="/painel/clientes"
        mostrarCpf={podeAcessar(usuario.perfis, "painel-administracao")}
      />
    </>
  );
}
