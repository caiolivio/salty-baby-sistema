import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { exigirPagina } from "@/lib/acesso";
import { podeAlterar } from "@/lib/permissoes";
import { prisma } from "@/lib/banco";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { nomeDoStatus } from "@/lib/situacoes";
import { TAMANHOS } from "@/lib/tamanhos";
import {
  condicaoDaBusca,
  filtrandoPecas,
  lerBuscaDePecas,
  linkDaBuscaDePecas,
  nomeDoStatusDoFiltro,
  resumoDaBusca,
  STATUS_DO_FILTRO,
} from "@/lib/pecas/busca";
import { EnviarAoMudar } from "./enviar-ao-mudar";
import { ImprimirEtiquetas } from "./imprimir-etiquetas";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { BotoesExportar } from "../exportar/botoes";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Peças" };

const POR_PAGINA = 50;

export default async function Pecas({ searchParams }: PageProps<"/painel/pecas">) {
  const { acesso } = await exigirPagina("pecas", "ver", "/painel/pecas");
  const loja = await lerLoja();
  const parametros = await searchParams;
  const excluida = typeof parametros.excluida === "string" ? parametros.excluida : "";
  const f = lerBuscaDePecas(parametros);
  const { pagina } = f;
  const filtro: Prisma.PecaWhereInput = condicaoDaBusca(f);

  const [total, pecas, categorias] = await Promise.all([
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
    prisma.categoria.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }], select: { id: true, nome: true } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) => linkDaBuscaDePecas(f, { pagina: p });
  const nomeTamanho = (t: string | null) => TAMANHOS.find((x) => x.valor === t)?.valor ?? t ?? "";

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Peças</h1>
        <span className={proprios.exportar}>
          <BotoesExportar tabela="pecas" />
          {podeAlterar(acesso, "pecas") && (
            <Link href="/painel/pecas/nova" className={proprios.botao}>
              <Plus className="icone" aria-hidden />
              Nova peça
            </Link>
          )}
        </span>
      </div>
      {excluida && (
        <p className={proprios.aviso} role="status">
          Peça {excluida} excluída. O código dela não será usado de novo.
        </p>
      )}
      <form className={estilos.filtrosPecas} role="search" method="get">
        <div className={estilos.busca}>
          <Search className="icone" aria-hidden />
          <input
            name="q"
            defaultValue={f.busca ?? ""}
            placeholder="Código novo ou antigo, nome, marca ou fornecedora (ex.: F06)"
            aria-label="Buscar peças"
          />
          <button type="submit">Buscar</button>
        </div>
        <div className={estilos.listasFiltro}>
          <label>
            Categoria
            <select name="categoria" defaultValue={f.categoria ?? ""}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tamanho
            <select name="tamanho" defaultValue={f.tamanho ?? ""}>
              <option value="">Todos</option>
              {TAMANHOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={f.status ?? ""}>
              <option value="">Todos</option>
              {STATUS_DO_FILTRO.map((s) => (
                <option key={s} value={s}>
                  {nomeDoStatusDoFiltro(s)}
                </option>
              ))}
            </select>
          </label>
          <EnviarAoMudar />
        </div>
      </form>
      <p className={estilos.contagem}>
        {resumoDaBusca(total, f, categorias.find((c) => c.id === f.categoria)?.nome)}
        {filtrandoPecas(f) && (
          <>
            {" "}
            <Link href="/painel/pecas">Limpar filtros</Link>
          </>
        )}
      </p>
      <ImprimirEtiquetas voltar={link(pagina)} />
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th className={estilos.marcar}>
                <span className={proprios.escondido}>Etiqueta</span>
              </th>
              <th>Foto</th>
              <th>Código</th>
              <th>Peça</th>
              <th>Fornecedora</th>
              <th>Tamanho</th>
              <th className={estilos.numero}>Preço</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pecas.map((p) => (
              <tr key={p.id} className={estilos.comFoto}>
                <td className={estilos.marcar}>
                  <input type="checkbox" name="ids" value={p.id} form="etiquetas" aria-label={`Etiqueta de ${p.codigo}`} />
                </td>
                <td className={estilos.foto}>
                  {p.fotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio
                    <img className={estilos.miniatura} src={enderecoDaFoto(p.fotos[0].arquivo, true)} alt="" loading="lazy" />
                  ) : (
                    <span className={estilos.miniatura} />
                  )}
                </td>
                <td className={estilos.curta}>
                  <Link href={`/painel/pecas/${p.id}`} className={estilos.codigo}>
                    {p.codigo}
                  </Link>
                  {p.codigoAntigo && <span className={estilos.antigo}>antigo {p.codigoAntigo}</span>}
                </td>
                <td>
                  {p.nome}
                  {p.marca && <span className={estilos.antigo}>{p.marca}</span>}
                </td>
                <td data-rotulo="Fornecedora">
                  {p.fornecedora ? (
                    <>
                      <span className={estilos.curta}>{p.fornecedora.codigo}</span>
                      <span className={estilos.antigo}>{p.fornecedora.nome}</span>
                    </>
                  ) : (
                    `${loja.nomeCurto} (loja)`
                  )}
                </td>
                <td className={`${estilos.curta} ${estilos.emLinha}`} data-rotulo="Tam.">
                  {nomeTamanho(p.tamanho)}
                </td>
                <td className={`${estilos.numero} ${estilos.emLinha} ${estilos.valor}`}>{formatarReais(p.precoCentavos)}</td>
                <td className={`${estilos.curta} ${estilos.emLinha}`}>
                  <span className={estilos.selo} data-status={p.naoListada && p.status === "publicada" ? "nao_listada" : p.status}>
                    {nomeDoStatus(p.status, p.naoListada)}
                    {p.quantidade > 1 && ` (${p.quantidade})`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <nav className={estilos.paginas} aria-label="Páginas">
          {pagina > 1 && (
            <Link href={link(pagina - 1)} className={estilos.comIcone}>
              <ChevronLeft className="icone" aria-hidden />
              Anteriores
            </Link>
          )}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link href={link(pagina + 1)} className={estilos.comIcone}>
              Próximas
              <ChevronRight className="icone" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
