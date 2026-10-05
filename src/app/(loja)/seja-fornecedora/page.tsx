import type { Metadata } from "next";
import { Passos } from "@/componentes/passos";
import { novoDesafio } from "@/lib/desafio/servidor";
import { LIMITE_PECAS_INSCRICAO, PASSOS, situacaoDosPassos } from "@/lib/fornecedoras/candidatura";
import estilos from "../loja.module.css";
import { FormularioInscricao } from "./formulario-inscricao";
import { lerLoja } from "@/lib/loja/servidor";
import { TextoDaPagina } from "@/componentes/texto-da-pagina";
import { paginaParaMostrar } from "@/lib/paginas/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const loja = await lerLoja();
  return {
    title: "Seja uma fornecedora",
    description: `Deixe as roupas e acessórios que seus filhos não usam mais com a ${loja.nome} e receba quando forem vendidos.`,
  };
}

export default async function SejaFornecedora() {
  const [loja, resumo] = await Promise.all([lerLoja(), paginaParaMostrar("resumo")]);
  return (
    <div className={estilos.paginaFornecedora}>
      <h1 className={estilos.tituloPagina}>Seja uma fornecedora {loja.nome}</h1>
      <Passos nomes={PASSOS} situacoes={situacaoDosPassos(1)} />
      <section className={estilos.explicacao}>
        <p>
          Tem roupas, calçados, brinquedos ou acessórios infantis em bom estado que não usa mais? Deixe com a {loja.nomeCurto}: nós
          fotografamos, anunciamos e vendemos, e você recebe uma parte de cada venda.
        </p>
        <p>
          <strong>Todas as peças passam por curadoria.</strong> A equipe da {loja.nomeCurto} avalia as fotos e entra em contato pelo
          WhatsApp para finalizar o seu cadastro. O aceite acontece em 3 passos:
        </p>
        <ol className={estilos.listaPassos}>
          <li>
            <strong>Inscrição</strong> (esta página): seus dados e até {LIMITE_PECAS_INSCRICAO} peças, com foto e descrição.
          </li>
          <li>
            <strong>Peças</strong>: se a curadoria aprovar, você recebe o acesso à sua área para mostrar mais peças, com
            todos os detalhes.
          </li>
          <li>
            <strong>Contrato</strong>: a {loja.nomeCurto} entra em contato e finaliza o seu cadastro. Você lê e aceita o
            contrato completo e vira parceira da {loja.nome}.
          </li>
        </ol>
      </section>
      <section className={estilos.resumoContrato} aria-labelledby="resumo-contrato">
        <h2 id="resumo-contrato">{resumo.titulo}</h2>
        <TextoDaPagina blocos={resumo.blocos} />
      </section>
      <FormularioInscricao desafio={await novoDesafio()} limite={LIMITE_PECAS_INSCRICAO} />
    </div>
  );
}
