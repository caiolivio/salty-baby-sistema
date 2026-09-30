import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { mostrarPercentual } from "@/lib/fornecedoras/dados";
import estilos from "../../painel.module.css";
import { salvarFornecedora } from "../acoes";
import proprios from "../fornecedora.module.css";
import { FormularioFornecedora } from "../formulario-fornecedora";

export const metadata: Metadata = { title: "Fornecedora · Salty Baby" };

const VENDIDAS = ["vendida", "na_sacolinha", "enviada", "retirada"] as const;

export default async function Fornecedora({ params, searchParams }: PageProps<"/painel/fornecedoras/[id]">) {
  const { id } = await params;
  await exigirAcesso("painel-administracao", `/painel/fornecedoras/${id}`);
  const aviso = await searchParams;

  const fornecedora = await prisma.fornecedora.findUnique({ where: { id } });
  if (!fornecedora) notFound();
  const [aVenda, vendidas] = await Promise.all([
    prisma.peca.count({ where: { fornecedoraId: id, quantidade: { gt: 0 }, status: { notIn: [...VENDIDAS] } } }),
    prisma.peca.count({ where: { fornecedoraId: id, status: { in: [...VENDIDAS] } } }),
  ]);
  const f = fornecedora;

  return (
    <>
      <p>
        <Link href="/painel/fornecedoras">← Fornecedoras</Link>
      </p>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>
          {f.codigo} · {f.nome}
          {!f.ativa && <span className={proprios.inativa}>inativa</span>}
        </h1>
      </div>
      {aviso.criada && (
        <p className={proprios.aviso} role="status">
          Fornecedora cadastrada com o código {f.codigo}.
        </p>
      )}
      {aviso.salva && (
        <p className={proprios.aviso} role="status">
          Alterações salvas.
        </p>
      )}
      <div className={proprios.resumo}>
        <Link href={`/painel/pecas?q=${f.codigo}`}>Ver as peças dela</Link>
        <span>{aVenda} em estoque</span>
        <span>{vendidas} vendida(s)</span>
      </div>
      <FormularioFornecedora
        acao={salvarFornecedora}
        textoBotao="Salvar alterações"
        voltar="/painel/fornecedoras"
        iniciais={{
          id: f.id,
          nome: f.nome,
          telefone: f.telefone ?? "",
          email: f.email ?? "",
          documento: f.documento ?? "",
          pix: f.pix ?? "",
          endereco: f.endereco ?? "",
          cep: f.cep ?? "",
          cidade: f.cidade ?? "",
          estado: f.estado ?? "",
          percentualRepassePadrao: mostrarPercentual(f.percentualRepassePadrao),
          ativa: f.ativa,
        }}
      />
    </>
  );
}
