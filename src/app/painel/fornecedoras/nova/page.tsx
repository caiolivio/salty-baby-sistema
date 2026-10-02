import type { Metadata } from "next";
import Link from "next/link";
import { exigirPagina } from "@/lib/acesso";
import { temExtra } from "@/lib/permissoes";
import { prisma } from "@/lib/banco";
import { CHAVE_SEQUENCIA_FORNECEDORA, codigoFornecedora } from "@/lib/codigos";
import { numeroSeguro } from "@/lib/fornecedoras/dados";
import estilos from "../../painel.module.css";
import { novaFornecedora } from "../acoes";
import { lerLoja } from "@/lib/loja/servidor";
import { mostrarPercentual } from "@/lib/fornecedoras/dados";
import { FormularioFornecedora } from "../formulario-fornecedora";

export const metadata: Metadata = { title: "Nova fornecedora" };

export default async function NovaFornecedora() {
  const { acesso } = await exigirPagina("fornecedoras", "alterar", "/painel/fornecedoras/nova");
  const [sequencia, maior] = await Promise.all([
    prisma.sequencia.findUnique({ where: { chave: CHAVE_SEQUENCIA_FORNECEDORA } }),
    prisma.fornecedora.aggregate({ _max: { numero: true } }),
  ]);
  // Só uma previsão: o código de verdade é reservado na hora de salvar.
  const previsto = codigoFornecedora(numeroSeguro((sequencia?.ultimo ?? 0) + 1, maior._max.numero));

  return (
    <>
      <p>
        <Link href="/painel/fornecedoras">← Fornecedoras</Link>
      </p>
      <h1 className={estilos.titulo}>Nova fornecedora</h1>
      <p>
        Ela vai receber o código <strong>{previsto}</strong>.
      </p>
      <FormularioFornecedora
        acao={novaFornecedora}
        iniciais={{ percentualRepassePadrao: mostrarPercentual((await lerLoja()).repassePadrao) }}
        textoBotao="Cadastrar fornecedora"
        voltar="/painel/fornecedoras"
        mostrarRepasse={temExtra(acesso, "valores")}
        mostrarDocumentos={acesso.administradora}
      />
    </>
  );
}
