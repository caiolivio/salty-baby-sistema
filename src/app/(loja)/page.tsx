import type { Metadata } from "next";
import Link from "next/link";
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
import estilos from "./loja.module.css";
import { quemVeALoja } from "./quem-ve";

export const metadata: Metadata = {
  title: "Salty Baby · Moda Sustentável",
  description: "Brechó infantil em Caraguatatuba-SP. Roupas, calçados e acessórios de bebê e criança.",
};

/** Só aparece na vitrine a peça à venda e com estoque. */
const A_VENDA: Prisma.PecaWhereInput = {
  status: "publicada",
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
      generos.length > 0 ? { OR: [{ genero: { in: generos as Genero[] } }, { genero: null }] } : {},
      f.busca
        ? {
            OR: [{ nome: { contains: f.busca } }, { marca: { contains: f.busca } }, { codigo: { contains: f.busca } }],
          }
        : {},
    ],
  };

  const [total, pecas, tamanhos, categorias] = await Promise.all([
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
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA_VITRINE));
  const quem = await quemVeALoja(pecas.map((p) => p.id));
  const filtrando = Boolean(f.tamanho || f.publico || f.categoria || f.busca);

  return (
    <>
      <form className={estilos.filtros} role="search">
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
        <label className={estilos.buscaCampo}>
          Buscar
          <input name="q" defaultValue={f.busca ?? ""} placeholder="Nome, marca ou código" />
        </label>
        <button type="submit">Ver peças</button>
      </form>

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
              <CartaoPeca peca={p} favorita={quem.favoritas.has(p.id)} estrela={quem.estrela} voltar={linkDaVitrine(f, { pagina: f.pagina })} />
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <nav className={estilos.paginas} aria-label="Páginas">
          {f.pagina > 1 && <Link href={linkDaVitrine(f, { pagina: f.pagina - 1 })}>← Anteriores</Link>}
          <span>
            Página {f.pagina} de {paginas}
          </span>
          {f.pagina < paginas && <Link href={linkDaVitrine(f, { pagina: f.pagina + 1 })}>Próximas →</Link>}
        </nav>
      )}
    </>
  );
}
