import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import { fichaDaCliente } from "@/lib/clientes/contas";
import { formatarTelefone } from "@/lib/pedidos/regras";
import estilos from "../../loja.module.css";
import { FormularioPerfil, FormularioSenha } from "./formularios";

export const metadata: Metadata = { title: "Meus dados · Salty Baby" };

export default async function MeusDados() {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/perfil");
  const ficha = await fichaDaCliente(usuario);
  return (
    <>
      <section className={estilos.secao} aria-labelledby="titulo-dados">
        <h2 id="titulo-dados">Meus dados</h2>
        <p>A loja usa estes dados para falar com você sobre seus pedidos.</p>
        <FormularioPerfil
          nome={ficha.nome}
          email={usuario.email}
          telefone={ficha.telefone ? formatarTelefone(ficha.telefone) : ""}
        />
      </section>
      <section className={estilos.secao} aria-labelledby="titulo-senha">
        <h2 id="titulo-senha">Trocar senha</h2>
        <FormularioSenha />
      </section>
    </>
  );
}
