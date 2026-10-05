import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Voltar } from "@/componentes/voltar";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { enderecoDaFoto } from "@/lib/fotos";
import { listarGruposEmUso } from "@/lib/grupos/opcoes";
import { LIMITE_DIVULGACAO } from "@/lib/grupos/regras";
import { aberturaDoResumo, resumoPorGrupo, semanaDoResumo } from "@/lib/grupos/resumo";
import { lerLoja } from "@/lib/loja/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { precoDoPost } from "@/lib/promocoes/regras";
import { promocoesDasPecas } from "@/lib/promocoes/servidor";
import { TAMANHOS } from "@/lib/tamanhos";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import marketing from "../marketing.module.css";
import { MontarPost } from "../montar-post";

export const metadata: Metadata = { title: "Resumo da semana" };

const nomeDoTamanho = (t: string | null) => TAMANHOS.find((x) => x.valor === t)?.nome ?? t;

/** Resumo semanal: um post por grupo com as peças que entraram no site na semana. */
export default async function ResumoDaSemana({ searchParams }: PageProps<"/painel/marketing/resumo">) {
  await exigirPagina("marketing", "ver", "/painel/marketing/resumo");
  await liberarReservasVencidas();
  const { de } = await searchParams;
  const semana = semanaDoResumo(de, hojeEmSaoPaulo());

  const [pecas, grupos, loja] = await Promise.all([
    prisma.peca.findMany({
      where: {
        status: "publicada",
        quantidade: { gt: 0 },
        publicadaEm: { gte: new Date(`${semana.de}T00:00:00Z`), lte: new Date(`${semana.ate}T00:00:00Z`) },
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        tamanho: true,
        genero: true,
        precoCentavos: true,
        descricao: true,
        marca: true,
        nota: true,
        publicadaEm: true,
        fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
        categorias: { select: { categoria: { select: { nome: true } } } },
      },
    }),
    listarGruposEmUso(),
    lerLoja(),
  ]);
  const promocoes = await promocoesDasPecas(pecas);
  const resumo = resumoPorGrupo(
    pecas.map((p) => ({ ...p, categorias: p.categorias.map((c) => c.categoria.nome), emPromocao: promocoes.has(p.id) })),
    grupos,
    semana,
  );
  const origem = origemDaRequisicao(await headers());

  return (
    <>
      <p>
        <Voltar href="/painel/marketing">WhatsApp Marketing</Voltar>
      </p>
      <h1 className={estilos.titulo}>Resumo da semana</h1>
      <p>
        Um post para cada grupo com as peças que entraram à venda no site nestes 7 dias e ainda estão à venda, pelas regras do
        grupo sugerido. Confira o texto, mude o que quiser e mande no grupo.
      </p>
      <nav className={proprios.resumo} aria-label="Escolher a semana">
        <Link href={`/painel/marketing/resumo?de=${semana.anterior}`}>‹ 7 dias antes</Link>
        <strong>{semana.rotulo}</strong>
        {semana.seguinte && <Link href={`/painel/marketing/resumo?de=${semana.seguinte}`}>7 dias depois ›</Link>}
      </nav>

      {resumo.length === 0 && (
        <p>
          Nenhum grupo ativo. Cadastre os grupos em <Link href="/painel/marketing/grupos">Grupos</Link>.
        </p>
      )}
      {resumo.map(({ grupo, pecas: doGrupo, total }) => (
        <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`}>
          <details className={marketing.resumoGrupo} open={doGrupo.length > 0}>
            <summary>
              <h2 id={`grupo-${grupo.id}`}>
                {grupo.nome} · {total === 0 ? "nenhuma peça nova" : total === 1 ? "1 peça nova" : `${total} peças novas`}
              </h2>
            </summary>
            {doGrupo.length === 0 ? (
              <p>Nenhuma peça entrou no site para este grupo nesta semana.</p>
            ) : (
              <>
                {total > doGrupo.length && (
                  <p className={proprios.dica}>
                    O WhatsApp manda no máximo {LIMITE_DIVULGACAO} fotos de uma vez: o post leva as {LIMITE_DIVULGACAO} mais
                    novas.
                  </p>
                )}
                <MontarPost
                  grupos={[{ id: grupo.id, nome: grupo.nome, codigo: grupo.codigo }]}
                  sugeridoId={grupo.id}
                  inicial={aberturaDoResumo({
                    nomeCurto: loja.nomeCurto,
                    quantidade: doGrupo.length,
                    promocao: grupo.papel === "promocao",
                  })}
                  origem={origem}
                  pecas={doGrupo.map((p) => ({
                    codigo: p.codigo,
                    nome: p.nome,
                    descricao: p.descricao,
                    categorias: p.categorias,
                    tamanho: nomeDoTamanho(p.tamanho),
                    preco: precoDoPost(p.precoCentavos, promocoes.get(p.id)),
                    marca: p.marca,
                    nota: p.nota,
                    foto: p.fotos[0] ? enderecoDaFoto(p.fotos[0].arquivo) : null,
                  }))}
                />
              </>
            )}
          </details>
        </section>
      ))}
    </>
  );
}
