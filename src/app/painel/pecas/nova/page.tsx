import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { mostrarPercentual } from "@/lib/fornecedoras/dados";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import estilos from "../../painel.module.css";
import { novaPeca } from "../acoes";
import { opcoesDeCategoria } from "../categorias";
import { FormularioPeca } from "../formulario-peca";

export const metadata: Metadata = { title: "Nova peça · Salty Baby" };

export default async function NovaPeca({ searchParams }: PageProps<"/painel/pecas/nova">) {
  await exigirAcesso("painel", "/painel/pecas/nova");
  const { fornecedora } = await searchParams;
  const [fornecedoras, categorias] = await Promise.all([
    prisma.fornecedora.findMany({
      where: { ativa: true },
      orderBy: { numero: "asc" },
      select: { id: true, codigo: true, nome: true, percentualRepassePadrao: true },
    }),
    opcoesDeCategoria(),
  ]);

  return (
    <>
      <p>
        <Link href="/painel/pecas">← Peças</Link>
      </p>
      <h1 className={estilos.titulo}>Nova peça</h1>
      <p>O código é criado ao salvar, na sequência da fornecedora escolhida.</p>
      <FormularioPeca
        acao={novaPeca}
        textoBotao="Cadastrar peça"
        voltar="/painel/pecas"
        categorias={categorias}
        fornecedoras={fornecedoras.map((f) => ({
          id: f.id,
          codigo: f.codigo,
          nome: f.nome,
          repasse: mostrarPercentual(f.percentualRepassePadrao),
        }))}
        iniciais={{
          fornecedoraId: typeof fornecedora === "string" ? fornecedora : "",
          quantidade: "1",
          status: "rascunho",
          dataEntrada: hojeEmSaoPaulo(),
        }}
      />
    </>
  );
}
