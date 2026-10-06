import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarTelefone } from "@/lib/pedidos/regras";
import estilos from "../painel.module.css";
import { FormularioMeusDados, FormularioMinhaSenha } from "./formularios";

export const metadata: Metadata = { title: "Meus dados" };

export default async function MeusDados() {
  const { id } = await exigirAcesso("painel", "/painel/meus-dados");
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id }, select: { nome: true, email: true, whatsapp: true } });
  return (
    <>
      <h1 className={estilos.titulo}>Meus dados</h1>
      <section aria-labelledby="dados">
        <h2 id="dados">Seus dados</h2>
        <FormularioMeusDados
          iniciais={{
            nome: usuario.nome,
            email: usuario.email,
            whatsapp: usuario.whatsapp ? formatarTelefone(usuario.whatsapp) : "",
          }}
        />
      </section>
      <section aria-labelledby="senha">
        <h2 id="senha">Trocar a senha</h2>
        <FormularioMinhaSenha />
      </section>
    </>
  );
}
