import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import { fichaDaCliente } from "@/lib/clientes/contas";
import { formatarTelefone } from "@/lib/pedidos/regras";
import estilos from "../../loja.module.css";
import { FormularioPerfil, FormularioSenha } from "./formularios";
import { prisma } from "@/lib/banco";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { FormularioCrianca } from "@/app/painel/clientes/criancas";
import { gravarMinhaCrianca, removerMinhaCrianca } from "../acoes";

export const metadata: Metadata = { title: "Meus dados" };

export default async function MeusDados() {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/perfil");
  const ficha = await fichaDaCliente(usuario);
  const endereco = await prisma.cliente.findUnique({
    where: { id: ficha.id },
    select: { endereco: true, cep: true, cidade: true, estado: true },
  });
  const criancas = await prisma.crianca.findMany({
    where: { clienteId: ficha.id },
    orderBy: [{ nascimento: "asc" }, { criadoEm: "asc" }],
  });
  const hoje = hojeEmSaoPaulo();
  return (
    <>
      <section className={estilos.secao} aria-labelledby="titulo-dados">
        <h2 id="titulo-dados">Meus dados</h2>
        <p>A loja usa estes dados para falar com você sobre seus pedidos.</p>
        <FormularioPerfil
          nome={ficha.nome}
          email={usuario.email}
          telefone={ficha.telefone ? formatarTelefone(ficha.telefone) : ""}
          endereco={endereco?.endereco ?? ""}
          cep={endereco?.cep ?? ""}
          cidade={endereco?.cidade ?? ""}
          estado={endereco?.estado ?? ""}
        />
      </section>
      <section className={estilos.secao} aria-labelledby="titulo-criancas">
        <h2 id="titulo-criancas">Minhas crianças</h2>
        <p>
          Conte para quem você compra: com o nascimento ou o tamanho que veste hoje, a gente mostra as peças que servem e
          lembra do próximo tamanho quando ela crescer.
        </p>
        <div className={estilos.criancas}>
          {criancas.map((k) => (
            <FormularioCrianca
              key={k.id}
              clienteId={ficha.id}
              hoje={hoje}
              gravar={gravarMinhaCrianca}
              remover={removerMinhaCrianca}
              crianca={{
                id: k.id,
                nome: k.nome,
                nascimento: k.nascimento ? k.nascimento.toISOString().slice(0, 10) : "",
                sexo: k.sexo ?? "",
                tamanho: k.tamanho ?? "",
                resumo: k.nome,
              }}
            />
          ))}
          <FormularioCrianca clienteId={ficha.id} hoje={hoje} gravar={gravarMinhaCrianca} remover={removerMinhaCrianca} />
        </div>
      </section>
      <section className={estilos.secao} aria-labelledby="titulo-senha">
        <h2 id="titulo-senha">Trocar senha</h2>
        <FormularioSenha />
      </section>
    </>
  );
}
