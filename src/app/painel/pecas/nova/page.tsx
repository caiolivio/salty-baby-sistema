import type { Metadata } from "next";
import Link from "next/link";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { podeAlterar, temExtra } from "@/lib/permissoes";
import { mostrarPercentual } from "@/lib/fornecedoras/dados";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import estilos from "../../painel.module.css";
import { novaPeca } from "../acoes";
import { opcoesDeCategoria } from "../categorias";
import { FormularioPeca } from "../formulario-peca";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Nova peça" };

export default async function NovaPeca({ searchParams }: PageProps<"/painel/pecas/nova">) {
  const usuario = await exigirPagina("pecas", "alterar", "/painel/pecas/nova");
  const { fornecedora } = await searchParams;
  const [fornecedoras, categorias] = await Promise.all([
    prisma.fornecedora.findMany({
      where: { ativa: true },
      orderBy: { numero: "asc" },
      select: { id: true, codigo: true, nome: true, percentualRepassePadrao: true },
    }),
    opcoesDeCategoria(),
  ]);
  const loja = await lerLoja();

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
        podeIncluirCategoria={podeAlterar(usuario.acesso, "categorias")}
        mostrarValores={temExtra(usuario.acesso, "valores")}
        opcaoDaLoja={`${loja.nomeCurto} (peça da loja, código ${loja.prefixoLoja})`}
        fornecedoras={fornecedoras.map((f) => ({
          id: f.id,
          codigo: f.codigo,
          nome: f.nome,
          repasse: temExtra(usuario.acesso, "valores") ? mostrarPercentual(f.percentualRepassePadrao) : "",
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
