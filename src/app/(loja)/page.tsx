import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Genero, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/banco";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import {
  generosDoPublico,
  lerFiltros,
  linkDaVitrine,
  POR_PAGINA_VITRINE,
  PUBLICOS,
  tamanhosDisponiveis,
} from "@/lib/vitrine";
import { CartaoPeca, SELECAO_CARTAO } from "./cartao-peca";
import { FiltrosDaVitrine } from "./filtros-da-vitrine";
import estilos from "./loja.module.css";
import { quemVeALoja } from "./quem-ve";
import { criarAviso } from "./minha-conta/acoes";
import { lerLoja } from "@/lib/loja/servidor";
import { ondeEmPromocao, promocoesDasPecas } from "@/lib/promocoes/servidor";

// Título e descrição: os da loja (layout raiz).
export const metadata: Metadata = {};

/** Só aparece na vitrine a peça à venda e com estoque. */
const A_VENDA: Prisma.PecaWhereInput = {
  status: "publicada",
  // "Não listado" está à venda, mas só para quem tem o link.
  naoListada: false,
  quantidade: { gt: 0 },
};

export default async function Vitrine({ searchParams }: PageProps<"/">) {
  const f = lerFiltros(await searchParams);
  await liberarReservasVencidas();
  const generos = generosDoPublico(f.publico);
  // Peça sem gênero cadastrado (as importadas do Notion) aparece para menina e menino.
  const onde: Prisma.PecaWhereInput = {
    ...A_VENDA,
    ...(f.tamanho && { tamanho: f.tamanho }),
    ...(f.categoria && { categorias: { some: { categoriaId: f.categoria } } }),
    AND: [
      f.promocao ? ondeEmPromocao() : {},
      generos.length > 0 ? { OR: [{ genero: { in: generos as Genero[] } }, { genero: null }] } : {},
      f.busca
        ? {
            OR: [{ nome: { contains: f.busca } }, { marca: { contains: f.busca } }, { codigo: { contains: f.busca } }],
          }
        : {},
    ],
  };

  const [total, pecas, tamanhos, categorias, emPromocao] = await Promise.all([
    prisma.peca.count({ where: onde }),
    prisma.peca.findMany({
      where: onde,
      orderBy: [{ dataEntrada: "desc" }, { codigo: "desc" }],
      skip: (f.pagina - 1) * POR_PAGINA_VITRINE,
      take: POR_PAGINA_VITRINE,
      select: SELECAO_CARTAO,
    }),
    prisma.peca.findMany({
      where: A_VENDA,
      distinct: ["tamanho"],
      select: { tamanho: true },
    }),
    prisma.categoria.findMany({
      where: { pecas: { some: { peca: A_VENDA } } },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true },
    }),
    prisma.peca.count({ where: { ...A_VENDA, ...ondeEmPromocao() } }),
  ]);
  const promocoes = await promocoesDasPecas(pecas);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA_VITRINE));
  const quem = await quemVeALoja(pecas.map((p) => p.id));
  const filtrando = Boolean(f.tamanho || f.publico || f.categoria || f.busca || f.promocao);
  const loja = await lerLoja();

  return (
    <>
      {!filtrando && f.pagina === 1 && (
        <section className={estilos.abertura}>
          {loja.descricao && <p className="sobretitulo">{loja.descricao}</p>}
          <h1>{loja.slogan ?? loja.nome}</h1>
          <p>Roupas e acessórios infantis escolhidos um a um, prontos para uma nova história.</p>
        </section>
      )}
      <FiltrosDaVitrine className={estilos.filtros}>
        <label>
          Tamanho
          <select name="tamanho" defaultValue={f.tamanho ?? ""}>
            <option value="">Todos</option>
            {tamanhosDisponiveis(tamanhos.map((t) => t.tamanho)).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Para
          <select name="publico" defaultValue={f.publico ?? ""}>
            <option value="">Menina e menino</option>
            {PUBLICOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        {categorias.length > 0 && (
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
        )}
        {(emPromocao > 0 || f.promocao) && (
          <label>
            Preço
            <select name="promocao" defaultValue={f.promocao ? "1" : ""}>
              <option value="">Todos</option>
              <option value="1">Em promoção</option>
            </select>
          </label>
        )}
        <div className={estilos.campoBusca}>
          <Search className="icone" aria-hidden />
          <input name="q" defaultValue={f.busca ?? ""} placeholder="Buscar por nome, marca ou código" aria-label="Buscar" type="search" />
          <button type="submit" aria-label="Ver peças">
            Buscar
          </button>
        </div>
      </FiltrosDaVitrine>

      <p className={estilos.contagem}>
        {total === 0 ? "Nenhuma peça encontrada" : total === 1 ? "1 peça" : `${total} peças`}
        {filtrando && (
          <>
            {" · "}
            <Link href="/">Limpar filtros</Link>
          </>
        )}
      </p>

      {pecas.length > 0 && (
        <ul className={estilos.grade}>
          {pecas.map((p) => (
            <li key={p.id}>
              <CartaoPeca
                peca={p}
                promocao={promocoes.get(p.id)}
                favorita={quem.favoritas.has(p.id)} estrela={quem.estrela} voltar={linkDaVitrine(f, { pagina: f.pagina })} />
            </li>
          ))}
        </ul>
      )}

      {(f.tamanho || f.publico || f.categoria) && (
        <form action={criarAviso} className={estilos.meAvise}>
          <input type="hidden" name="voltar" value={linkDaVitrine(f)} />
          <input type="hidden" name="tamanho" value={f.tamanho ?? ""} />
          <input type="hidden" name="publico" value={f.publico ?? ""} />
          <input type="hidden" name="categoria" value={f.categoria ?? ""} />
          <p>
            <strong>Não achou o que procurava?</strong> A gente avisa pelo WhatsApp quando chegar peça{" "}
            {[f.tamanho && `no tamanho ${f.tamanho}`, f.categoria && categorias.find((c) => c.id === f.categoria)?.nome.toLowerCase()]
              .filter(Boolean)
              .join(", ")}
            {f.publico && ` para ${f.publico}`}.
          </p>
          <button type="submit" className={estilos.botaoWhats}>
            <BellRing className="icone" aria-hidden />
            Me avise quando chegar
          </button>
        </form>
      )}

      {paginas > 1 && (
        <nav className={estilos.paginas} aria-label="Páginas">
          {f.pagina > 1 && (
            <Link href={linkDaVitrine(f, { pagina: f.pagina - 1 })} className={estilos.voltar}>
              <ChevronLeft className="icone" aria-hidden />
              Anteriores
            </Link>
          )}
          <span>
            Página {f.pagina} de {paginas}
          </span>
          {f.pagina < paginas && (
            <Link href={linkDaVitrine(f, { pagina: f.pagina + 1 })} className={estilos.voltar}>
              Próximas
              <ChevronRight className="icone" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
