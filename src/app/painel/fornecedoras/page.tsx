import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { podeAcessar } from "@/lib/permissoes";
import estilos from "../painel.module.css";
import proprios from "../formulario.module.css";

export const metadata: Metadata = { title: "Fornecedoras · Salty Baby" };

export default async function Fornecedoras({ searchParams }: PageProps<"/painel/fornecedoras">) {
  const usuario = await exigirAcesso("painel", "/painel/fornecedoras");
  const administradora = podeAcessar(usuario.perfis, "painel-administracao");
  const parametros = await searchParams;
  const busca = typeof parametros.q === "string" ? parametros.q.trim() : "";

  const filtro: Prisma.FornecedoraWhereInput = busca
    ? { OR: [{ codigo: busca.toUpperCase() }, { nome: { contains: busca } }, { cidade: { contains: busca } }] }
    : {};
  const [fornecedoras, emEstoque, vendidas] = await Promise.all([
    prisma.fornecedora.findMany({
      where: filtro,
      orderBy: { numero: "asc" },
      select: { id: true, codigo: true, nome: true, cidade: true, ativa: true },
    }),
    prisma.peca.groupBy({ by: ["fornecedoraId"], where: { quantidade: { gt: 0 } }, _count: true }),
    prisma.peca.groupBy({ by: ["fornecedoraId"], where: { status: { in: ["vendida", "enviada", "retirada", "na_sacolinha"] } }, _count: true }),
  ]);
  const contar = (lista: { fornecedoraId: string | null; _count: number }[], id: string) =>
    lista.find((l) => l.fornecedoraId === id)?._count ?? 0;

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Fornecedoras</h1>
        {administradora && (
          <Link href="/painel/fornecedoras/nova" className={proprios.botao}>
            + Nova fornecedora
          </Link>
        )}
      </div>
      <form className={estilos.busca} role="search">
        <input name="q" defaultValue={busca} placeholder="Código (ex.: F06), nome ou cidade" aria-label="Buscar fornecedoras" />
        <button type="submit">Buscar</button>
      </form>
      <p>
        {fornecedoras.length} fornecedora(s){busca && ` encontradas para "${busca}"`}.
      </p>
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
                <td>
                  {administradora ? <Link href={`/painel/fornecedoras/${f.id}`}>{f.nome}</Link> : f.nome}
                  {!f.ativa && <span className={proprios.inativa}>inativa</span>}
                </td>
                <td data-rotulo="Cidade">{f.cidade}</td>
                <td className={estilos.numero} data-rotulo="À venda">
                  <Link href={`/painel/pecas?q=${f.codigo}`}>{contar(emEstoque, f.id)}</Link>
                </td>
                <td className={estilos.numero} data-rotulo="Vendidas">
                  {contar(vendidas, f.id)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
