import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { podeAcessar } from "@/lib/permissoes";
import estilos from "../../painel.module.css";
import { novaCliente } from "../acoes";
import { FormularioCliente } from "../formulario-cliente";

export const metadata: Metadata = { title: "Nova cliente" };

export default async function NovaCliente() {
  const usuario = await exigirAcesso("painel", "/painel/clientes/nova");
  return (
    <>
      <p>
        <Link href="/painel/clientes">← Clientes</Link>
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
