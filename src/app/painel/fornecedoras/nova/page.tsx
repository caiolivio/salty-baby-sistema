import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { CHAVE_SEQUENCIA_FORNECEDORA, codigoFornecedora } from "@/lib/codigos";
import { numeroSeguro } from "@/lib/fornecedoras/dados";
import estilos from "../../painel.module.css";
import { novaFornecedora } from "../acoes";
import { FormularioFornecedora } from "../formulario-fornecedora";

export const metadata: Metadata = { title: "Nova fornecedora · Salty Baby" };

export default async function NovaFornecedora() {
  await exigirAcesso("painel-administracao", "/painel/fornecedoras/nova");
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
      <FormularioFornecedora acao={novaFornecedora} iniciais={{}} textoBotao="Cadastrar fornecedora" voltar="/painel/fornecedoras" />
    </>
  );
}
