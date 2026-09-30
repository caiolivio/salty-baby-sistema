import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { NOMES_SITUACAO } from "@/lib/situacoes";
import { TAMANHOS } from "@/lib/tamanhos";
import estilos from "../painel.module.css";

export const metadata: Metadata = { title: "Peças · Salty Baby" };

const POR_PAGINA = 50;

export default async function Pecas({ searchParams }: PageProps<"/painel/pecas">) {
  await exigirAcesso("painel", "/painel/pecas");
  const parametros = await searchParams;
  const busca = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  // A busca encontra a peça pelo código novo, pelo antigo do Notion, pelo nome ou pela marca.
  const filtro: Prisma.PecaWhereInput = busca
    ? {
        OR: [
          { codigo: { contains: busca } },
          { codigoAntigo: { contains: busca } },
          { nome: { contains: busca } },
          { marca: { contains: busca } },
          { fornecedora: { codigo: busca.toUpperCase() } },
        ],
      }
    : {};

  const [total, pecas] = await Promise.all([
    prisma.peca.count({ where: filtro }),
    prisma.peca.findMany({
      where: filtro,
      orderBy: { codigo: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        fornecedora: { select: { codigo: true, nome: true } },
        fotos: { orderBy: { ordem: "asc" }, take: 1 },
      },
    }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) => `/painel/pecas?${new URLSearchParams({ ...(busca ? { q: busca } : {}), pagina: String(p) })}`;
  const nomeTamanho = (t: string | null) => TAMANHOS.find((x) => x.valor === t)?.valor ?? t ?? "";

  return (
    <>
      <h1 className={estilos.titulo}>Peças</h1>
      <form className={estilos.busca} role="search">
        <input
          name="q"
          defaultValue={busca}
          placeholder="Código novo ou antigo, nome, marca ou fornecedora (ex.: F06)"
          aria-label="Buscar peças"
        />
        <button type="submit">Buscar</button>
      </form>
      <p>
        {total} peça(s){busca && ` encontradas para "${busca}"`}.
      </p>
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Código</th>
              <th>Peça</th>
              <th>Fornecedora</th>
              <th>Tamanho</th>
              <th className={estilos.numero}>Preço</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {pecas.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.fotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio
                    <img className={estilos.miniatura} src={enderecoDaFoto(p.fotos[0].arquivo, true)} alt="" loading="lazy" />
                  ) : (
                    <span className={estilos.miniatura} />
                  )}
                </td>
                <td>
                  <span className={estilos.codigo}>{p.codigo}</span>
                  {p.codigoAntigo && <span className={estilos.antigo}>antigo {p.codigoAntigo}</span>}
                </td>
                <td>
                  {p.nome}
                  {p.marca && <span className={estilos.antigo}>{p.marca}</span>}
                </td>
                <td>{p.fornecedora ? `${p.fornecedora.codigo} ${p.fornecedora.nome}` : "Salty (loja)"}</td>
                <td>{nomeTamanho(p.tamanho)}</td>
                <td className={estilos.numero}>{formatarReais(p.precoCentavos)}</td>
                <td>
                  {NOMES_SITUACAO[p.status] ?? p.status}
                  {p.quantidade > 1 && ` (${p.quantidade})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <nav className={estilos.paginas} aria-label="Páginas">
          {pagina > 1 && <Link href={link(pagina - 1)}>← Anteriores</Link>}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && <Link href={link(pagina + 1)}>Próximas →</Link>}
        </nav>
      )}
    </>
  );
}
