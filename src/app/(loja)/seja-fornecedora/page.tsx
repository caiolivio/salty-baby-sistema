import type { Metadata } from "next";
import { Passos } from "@/componentes/passos";
import { novoDesafio } from "@/lib/desafio/servidor";
import { LIMITE_PECAS_INSCRICAO, PASSOS, situacaoDosPassos } from "@/lib/fornecedoras/candidatura";
import estilos from "../loja.module.css";
import { FormularioInscricao } from "./formulario-inscricao";

export const metadata: Metadata = {
  title: "Seja uma fornecedora · Salty Baby",
  description: "Deixe as roupas e acessórios que seus filhos não usam mais com a Salty Baby e receba quando forem vendidos.",
};

export default async function SejaFornecedora() {
  return (
    <div className={estilos.paginaFornecedora}>
      <h1 className={estilos.tituloPagina}>Seja uma fornecedora Salty Baby</h1>
      <Passos nomes={PASSOS} situacoes={situacaoDosPassos(1)} />
      <section className={estilos.explicacao}>
        <p>
          Tem roupas, calçados, brinquedos ou acessórios infantis em bom estado que não usa mais? Deixe com a Salty: nós
          fotografamos, anunciamos e vendemos, e você recebe uma parte de cada venda.
        </p>
        <p>
          <strong>Todas as peças passam por curadoria.</strong> A equipe da Salty avalia as fotos e entra em contato pelo
          WhatsApp para finalizar o seu cadastro. O aceite acontece em 3 passos:
        </p>
        <ol className={estilos.listaPassos}>
          <li>
            <strong>Inscrição</strong> (esta página): seus dados e até {LIMITE_PECAS_INSCRICAO} peças, com foto e descrição.
          </li>
          <li>
            <strong>Peças e acordo</strong>: se a curadoria aprovar, você recebe o acesso à sua área para mostrar mais peças,
            com todos os detalhes, e ler e aceitar as regras da consignação.
          </li>
          <li>
            <strong>Parceria</strong>: a Salty entra em contato, finaliza o seu cadastro e você vira parceira da Salty Baby.
          </li>
        </ol>
      </section>
      <FormularioInscricao desafio={await novoDesafio()} limite={LIMITE_PECAS_INSCRICAO} />
    </div>
  );
}
