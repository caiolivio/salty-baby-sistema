import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import estilos from "../painel.module.css";

export const metadata: Metadata = { title: "Fornecedoras · Salty Baby" };

export default async function Fornecedoras() {
  await exigirAcesso("painel", "/painel/fornecedoras");
  const [fornecedoras, emEstoque, vendidas] = await Promise.all([
    prisma.fornecedora.findMany({ orderBy: { numero: "asc" }, select: { id: true, codigo: true, nome: true, cidade: true } }),
    prisma.peca.groupBy({ by: ["fornecedoraId"], where: { quantidade: { gt: 0 } }, _count: true }),
    prisma.peca.groupBy({ by: ["fornecedoraId"], where: { status: { in: ["vendida", "enviada", "retirada", "na_sacolinha"] } }, _count: true }),
  ]);
  const contar = (lista: { fornecedoraId: string | null; _count: number }[], id: string) =>
    lista.find((l) => l.fornecedoraId === id)?._count ?? 0;

  return (
    <>
      <h1 className={estilos.titulo}>Fornecedoras</h1>
      <p>{fornecedoras.length} fornecedora(s).</p>
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Cidade</th>
              <th className={estilos.numero}>À venda</th>
              <th className={estilos.numero}>Vendidas</th>
            </tr>
          </thead>
          <tbody>
            {fornecedoras.map((f) => (
              <tr key={f.id}>
                <td className={`${estilos.codigo} ${estilos.curta}`}>{f.codigo}</td>
                <td>{f.nome}</td>
                <td data-rotulo="Cidade">{f.cidade}</td>
                <td className={estilos.numero} data-rotulo="À venda">
                  <Link href={`/painel/pecas?q=${f.codigo}`}>{contar(emEstoque, f.id)}</Link>
                </td>
                <td className={estilos.numero} data-rotulo="Vendidas">{contar(vendidas, f.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
