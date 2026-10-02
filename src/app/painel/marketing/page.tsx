import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import type { Genero, Prisma } from "@/generated/prisma/client";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarReais } from "@/lib/dinheiro";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { enderecoDaFoto } from "@/lib/fotos";
import { listarGruposEmUso } from "@/lib/grupos/opcoes";
import { grupoMaisSugerido, LIMITE_DIVULGACAO } from "@/lib/grupos/regras";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { podeAcessar } from "@/lib/permissoes";
import { TAMANHOS } from "@/lib/tamanhos";
import { generosDoPublico, lerFiltros, PUBLICOS } from "@/lib/vitrine";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { incluirNaDivulgacao, limparDivulgacao, tirarDaDivulgacao } from "./acoes";
import { pecasDaDivulgacao } from "./lista-da-divulgacao";
import marketing from "./marketing.module.css";
import { MontarPost } from "./montar-post";

export const metadata: Metadata = { title: "WhatsApp Marketing" };

const RESULTADOS = 60;
const nomeDoTamanho = (t: string | null) => TAMANHOS.find((x) => x.valor === t)?.nome ?? t;

type Soma = { vendas: number; totalCentavos: number };
const somar = (vendas: { totalCentavos: number }[]): Soma => ({
  vendas: vendas.length,
  totalCentavos: vendas.reduce((s, v) => s + v.totalCentavos, 0),
});

export default async function WhatsappMarketing({ searchParams }: PageProps<"/painel/marketing">) {
  const usuario = await exigirAcesso("painel", "/painel/marketing");
  const administradora = podeAcessar(usuario.perfis, "painel-administracao");
  await liberarReservasVencidas();
  const f = lerFiltros(await searchParams);
  const buscou = Boolean(f.busca || f.categoria || f.tamanho || f.publico);

  // Busca de peças à venda para a divulgação: mesmos filtros da vitrine.
  const generos = generosDoPublico(f.publico);
  const onde: Prisma.PecaWhereInput = {
    status: "publicada",
    quantidade: { gt: 0 },
    ...(f.tamanho && { tamanho: f.tamanho }),
    ...(f.categoria && { categorias: { some: { categoriaId: f.categoria } } }),
    AND: [
      generos.length > 0 ? { OR: [{ genero: { in: generos as Genero[] } }, { genero: null }] } : {},
      f.busca
        ? {
            OR: [
              { codigo: { contains: f.busca } },
              { codigoAntigo: { contains: f.busca } },
              { nome: { contains: f.busca } },
              { marca: { contains: f.busca } },
            ],
          }
        : {},
    ],
  };
  const selecao = {
    id: true,
    codigo: true,
    nome: true,
    tamanho: true,
    genero: true,
    precoCentavos: true,
    status: true,
    naoListada: true,
    descricao: true,
    marca: true,
    nota: true,
    fotos: { orderBy: { ordem: "asc" as const }, take: 1, select: { arquivo: true } },
    categorias: { select: { categoria: { select: { nome: true } } } },
  };

  const ids = await pecasDaDivulgacao();
  const [encontradas, total, escolhidas, categorias, grupos] = await Promise.all([
    prisma.peca.findMany({ where: onde, orderBy: [{ dataEntrada: "desc" }, { codigo: "desc" }], take: RESULTADOS, select: selecao }),
    prisma.peca.count({ where: onde }),
    prisma.peca.findMany({ where: { id: { in: ids } }, select: selecao }),
    prisma.categoria.findMany({ where: { ativa: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }], select: { id: true, nome: true } }),
    listarGruposEmUso(),
  ]);
  const lista = ids.flatMap((id) => escolhidas.filter((p) => p.id === id));
  const sugerido = grupoMaisSugerido(
    lista.map((p) => ({ genero: p.genero, categorias: p.categorias.map((c) => c.categoria.nome) })),
    grupos,
  );
  const naLista = new Set(ids);
  const cheia = ids.length >= LIMITE_DIVULGACAO;
  const foto = (p: (typeof lista)[number]) => (p.fotos[0] ? enderecoDaFoto(p.fotos[0].arquivo, true) : null);

  return (
    <>
      <h1 className={estilos.titulo}>WhatsApp Marketing</h1>
      <p>
        Escolha as peças, escreva um título e um texto e mande tudo junto para o grupo. Cada peça vai com o link dela, marcado
        com o grupo, para a venda contar para ele.
      </p>

      <section id="lista" aria-labelledby="titulo-lista">
        <h2 id="titulo-lista">
          Divulgação · {lista.length} peça(s)
          {cheia && ` (limite de ${LIMITE_DIVULGACAO})`}
        </h2>
        {lista.length === 0 ? (
          <p>A lista está vazia. Escolha as peças na busca abaixo.</p>
        ) : (
          <>
            <ul className={marketing.lista}>
              {lista.map((p) => (
                <li key={p.id}>
                  {foto(p) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida
                    <img src={foto(p)!} alt="" />
                  ) : (
                    <span className={marketing.semFoto}>—</span>
                  )}
                  <span>
                    <Link href={`/painel/pecas/${p.id}`}>{p.codigo}</Link> {p.nome}
                    {p.tamanho && ` · ${p.tamanho}`} · {formatarReais(p.precoCentavos)}
                    {p.status !== "publicada" && <strong> · saiu da vitrine</strong>}
                    {p.status === "publicada" && p.naoListada && " · não listado (só pelo link)"}
                  </span>
                  <form action={tirarDaDivulgacao}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit">Tirar</button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={limparDivulgacao}>
              <button type="submit" className={proprios.botaoSecundario}>
                Limpar lista
              </button>
            </form>
          </>
        )}
        <h3>Post</h3>
        <MontarPost
          grupos={grupos.map(({ id, nome, codigo }) => ({ id, nome, codigo }))}
          sugeridoId={sugerido?.id}
          pecas={lista.map((p) => ({
            codigo: p.codigo,
            nome: p.nome,
            descricao: p.descricao,
            categorias: p.categorias.map((c) => c.categoria.nome),
            tamanho: nomeDoTamanho(p.tamanho),
            preco: formatarReais(p.precoCentavos),
            marca: p.marca,
            nota: p.nota,
            foto: p.fotos[0] ? enderecoDaFoto(p.fotos[0].arquivo) : null,
          }))}
          origem={origemDaRequisicao(await headers())}
        />
      </section>

      <section id="escolher" aria-labelledby="titulo-escolher">
        <h2 id="titulo-escolher">Escolher peças</h2>
        <form className={marketing.filtros} action="#escolher" role="search">
          <label className={proprios.campo}>
            Código ou nome
            <input name="q" defaultValue={f.busca} placeholder="Ex.: F06, body, Fakini" />
          </label>
          <label className={proprios.campo}>
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
          <label className={proprios.campo}>
            Tamanho (idade)
            <select name="tamanho" defaultValue={f.tamanho ?? ""}>
              <option value="">Todos</option>
              {TAMANHOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={proprios.campo}>
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
          <button type="submit" className={proprios.botao}>
            Buscar
          </button>
        </form>
        <p>
          {total} peça(s) à venda{buscou ? " com estes filtros" : ""}
          {total > RESULTADOS && `, mostrando as ${RESULTADOS} mais novas`}. Peça sem gênero aparece para menina e menino.
          As peças &quot;Não listado&quot; também aparecem aqui: não estão na vitrine, mas quem recebe o link pode comprar.
        </p>
        {encontradas.length > 0 && (
          <form action={incluirNaDivulgacao}>
            <div className={marketing.pecas}>
              {encontradas.map((p) => (
                <div key={p.id} className={marketing.peca}>
                  {foto(p) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida
                    <img src={foto(p)!} alt="" loading="lazy" />
                  ) : (
                    <span className={marketing.semFoto}>Sem foto</span>
                  )}
                  {p.naoListada && <span className={marketing.naoListada}>Não listado</span>}
                  {naLista.has(p.id) ? (
                    <span className={marketing.naLista}>✓ Na lista · {p.codigo}</span>
                  ) : (
                    <label>
                      <input type="checkbox" name="id" value={p.id} disabled={cheia} />
                      {p.codigo}
                    </label>
                  )}
                  <span>{p.nome}</span>
                  <span>
                    {p.tamanho && `${p.tamanho} · `}
                    {formatarReais(p.precoCentavos)}
                  </span>
                </div>
              ))}
            </div>
            <div className={proprios.acoes}>
              <button type="submit" className={proprios.botao} disabled={cheia}>
                Incluir marcadas na lista
              </button>
            </div>
          </form>
        )}
      </section>

      {administradora && <VendasPorGrupo />}
    </>
  );
}

async function VendasPorGrupo() {
  const hoje = hojeEmSaoPaulo();
  const inicioDoMes = new Date(`${hoje.slice(0, 8)}01T00:00:00Z`);
  const [ano, mes] = hoje.split("-").map(Number);
  const inicio12Meses = new Date(Date.UTC(ano - 1, mes, 1));
  const [grupos, vendas] = await Promise.all([
    prisma.grupoWhatsapp.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }], select: { id: true, nome: true } }),
    prisma.venda.findMany({
      where: { grupoId: { not: null }, data: { gte: inicio12Meses } },
      select: { grupoId: true, data: true, canal: true, totalCentavos: true },
    }),
  ]);
  const texto = (s: Soma) => `${s.vendas} · ${formatarReais(s.totalCentavos)}`;

  return (
    <section aria-labelledby="titulo-vendas">
      <div className={proprios.cabecalho}>
        <h2 id="titulo-vendas">Vendas por grupo</h2>
        <Link href="/painel/marketing/grupos" className={proprios.botaoSecundario}>
          Editar grupos
        </Link>
      </div>
      <p className={proprios.dica}>
        Contam as vendas registradas no painel com o grupo escolhido e os pedidos do site que vieram pelo link do post.
      </p>
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Grupo</th>
              <th className={estilos.numero}>Este mês</th>
              <th className={estilos.numero}>Últimos 12 meses</th>
              <th className={estilos.numero}>Pelo link do post (12 meses)</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              const doGrupo = vendas.filter((v) => v.grupoId === g.id);
              return (
                <tr key={g.id}>
                  <td>{g.nome}</td>
                  <td className={estilos.numero} data-rotulo="Este mês">
                    {texto(somar(doGrupo.filter((v) => v.data >= inicioDoMes)))}
                  </td>
                  <td className={estilos.numero} data-rotulo="Últimos 12 meses">
                    {texto(somar(doGrupo))}
                  </td>
                  <td className={estilos.numero} data-rotulo="Pelo link do post">
                    {texto(somar(doGrupo.filter((v) => v.canal === "site")))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
