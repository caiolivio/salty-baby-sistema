import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/banco";
import { formatarReais } from "@/lib/dinheiro";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { enderecoDaFoto } from "@/lib/fotos";
import { CONSERVACOES } from "@/lib/pecas/dados";
import { TAMANHOS } from "@/lib/tamanhos";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { COOKIE_GRUPO, lerCodigoGrupo, PARAMETRO_GRUPO } from "@/lib/grupos/regras";
import { COOKIE_CARRINHO, lerCarrinho } from "@/lib/pedidos/regras";
import {
  enderecoDaPeca,
  linkCompartilharWhatsapp,
  linkWhatsapp,
  mensagemDaPeca,
  mensagemParaAmiga,
} from "@/lib/vitrine";
import { incluir } from "../../carrinho/acoes";
import { Estrela } from "../../estrela";
import { lerLoja } from "@/lib/loja/servidor";
import estilos from "../../loja.module.css";
import { quemVeALoja } from "../../quem-ve";

// Só peças à venda ou reservadas aparecem para o público. Nada de fornecedora,
// custo ou repasse sai desta página.
const buscarPeca = cache(async (codigo: string) =>
  prisma.peca.findFirst({
    where: {
      codigo: decodeURIComponent(codigo).toUpperCase(),
      status: { in: ["publicada", "reservada"] },
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      status: true,
      naoListada: true,
      quantidade: true,
      tamanho: true,
      conservacao: true,
      variacao: true,
      marca: true,
      cor: true,
      medidas: true,
      descricao: true,
      precoCentavos: true,
      fotos: { orderBy: { ordem: "asc" }, select: { id: true, arquivo: true } },
      categorias: { select: { categoria: { select: { nome: true } } } },
    },
  }),
);

export async function generateMetadata({ params }: PageProps<"/peca/[codigo]">): Promise<Metadata> {
  const peca = await buscarPeca((await params).codigo);
  if (!peca) return { title: "Peça não encontrada" };
  const loja = await lerLoja();
  const titulo = `${peca.nome} · ${formatarReais(peca.precoCentavos)} · ${loja.nome}`;
  const foto = peca.fotos[0];
  return {
    title: { absolute: titulo },
    description:
      [peca.tamanho && `Tamanho ${peca.tamanho}`, peca.marca].filter(Boolean).join(" · ") || loja.nome,
    // Imagem que aparece quando o link é compartilhado no WhatsApp.
    metadataBase: new URL(origemDaRequisicao(await headers())),
    // Peça "Não listado": abre pelo link, mas não aparece no Google.
    ...(peca.naoListada && { robots: { index: false } }),
    openGraph: {
      title: titulo,
      images: foto ? [enderecoDaFoto(foto.arquivo)] : undefined,
    },
  };
}

export default async function PaginaPeca({ params, searchParams }: PageProps<"/peca/[codigo]">) {
  await liberarReservasVencidas();
  const peca = await buscarPeca((await params).codigo);
  if (!peca) notFound();
  const disponivel = peca.status === "publicada" && peca.quantidade > 0;
  const quem = await quemVeALoja([peca.id]);
  const biscoitos = await cookies();
  const noCarrinho = lerCarrinho(biscoitos.get(COOKIE_CARRINHO)?.value).includes(peca.id);
  // Grupo do link do post (?g=...) ou guardado de uma visita anterior.
  const codigoGrupo =
    lerCodigoGrupo((await searchParams)[PARAMETRO_GRUPO]) ?? lerCodigoGrupo(biscoitos.get(COOKIE_GRUPO)?.value);
  const grupo = codigoGrupo
    ? await prisma.grupoWhatsapp.findUnique({ where: { codigo: codigoGrupo }, select: { nome: true } })
    : null;
  const tamanho = TAMANHOS.find((t) => t.valor === peca.tamanho)?.nome ?? peca.tamanho;
  const conservacao = CONSERVACOES.find((c) => c.valor === peca.conservacao)?.nome;
  const categorias = peca.categorias.map((c) => c.categoria.nome).join(", ");
  const loja = await lerLoja();
  const whatsapp = linkWhatsapp(
    loja.whatsapp,
    mensagemDaPeca(
      {
        codigo: peca.codigo,
        nome: peca.nome,
        tamanho: peca.tamanho,
        preco: formatarReais(peca.precoCentavos),
      },
      origemDaRequisicao(await headers()),
      grupo?.nome,
    ),
  );
  const paraAmiga = linkCompartilharWhatsapp(
    mensagemParaAmiga(
      { codigo: peca.codigo, nome: peca.nome, tamanho: peca.tamanho, preco: formatarReais(peca.precoCentavos) },
      origemDaRequisicao(await headers()),
      loja.nome,
    ),
  );
  const detalhes: [string, string | null | undefined][] = [
    ["Tamanho", tamanho],
    ["Conservação", conservacao],
    ["Marca", peca.marca],
    ["Cor", peca.cor],
    ["Variação", peca.variacao],
    ["Medidas", peca.medidas],
    ["Categoria", categorias],
    ["Código", peca.codigo],
  ];

  return (
    <>
      <p>
        <Link href="/">← Ver todas as peças</Link>
      </p>
      <article className={estilos.peca}>
        <div className={estilos.galeria}>
          {peca.fotos.length === 0 ? (
            <span className={estilos.semFoto}>Sem foto</span>
          ) : (
            <>
              <div className={estilos.fotosGrandes}>
                {peca.fotos.map((foto, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- fotos já reduzidas no envio
                  <img
                    key={foto.id}
                    id={`foto-${i + 1}`}
                    src={enderecoDaFoto(foto.arquivo)}
                    alt={`${peca.nome}, foto ${i + 1}`}
                  />
                ))}
              </div>
              {peca.fotos.length > 1 && (
                <nav className={estilos.miniaturas} aria-label="Fotos">
                  {peca.fotos.map((foto, i) => (
                    <a key={foto.id} href={`#foto-${i + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
                      <img src={enderecoDaFoto(foto.arquivo, true)} alt={`Ver foto ${i + 1}`} />
                    </a>
                  ))}
                </nav>
              )}
            </>
          )}
        </div>
        <div className={estilos.info}>
          <h1>{peca.nome}</h1>
          <div className={estilos.precoEEstrela}>
            <strong className={estilos.precoGrande}>{formatarReais(peca.precoCentavos)}</strong>
            {quem.estrela && (
              <Estrela
                pecaId={peca.id}
                favorita={quem.favoritas.has(peca.id)}
                voltar={enderecoDaPeca(peca.codigo)}
                nome={peca.nome}
                grande
              />
            )}
          </div>
          {!disponivel && <p className={estilos.reservada}>Esta peça está reservada para outra cliente no momento.</p>}
          <dl className={estilos.detalhes}>
            {detalhes
              .filter(([, valor]) => valor)
              .map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt>{rotulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
          </dl>
          {peca.descricao && <p className={estilos.descricao}>{peca.descricao}</p>}
          {disponivel &&
            (noCarrinho ? (
              <div className={estilos.jaNoCarrinho}>
                <span>✓ Esta peça está no seu carrinho.</span>
                <Link href="/carrinho" className={estilos.botaoWhats}>
                  Ver carrinho e fechar pedido
                </Link>
              </div>
            ) : (
              <form action={incluir}>
                <input type="hidden" name="id" value={peca.id} />
                <input type="hidden" name="voltar" value={enderecoDaPeca(peca.codigo)} />
                <button type="submit" className={estilos.botaoWhats}>
                  Incluir no carrinho
                </button>
              </form>
            ))}
          {disponivel && whatsapp && (
            <a className={estilos.linkWhats} href={whatsapp} target="_blank" rel="noopener noreferrer">
              Tirar uma dúvida sobre esta peça no WhatsApp
            </a>
          )}
          <a className={estilos.compartilhar} href={paraAmiga} target="_blank" rel="noopener noreferrer">
            Compartilhar com alguém no WhatsApp
          </a>
        </div>
      </article>
    </>
  );
}
