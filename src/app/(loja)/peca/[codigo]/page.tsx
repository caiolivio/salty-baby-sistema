import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Check, MessageCircle, Share2, ShoppingBag } from "lucide-react";
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
import { entrarNaFilaDeEspera, sairDaFilaDeEspera } from "../../minha-conta/acoes";
import { filaDaPeca } from "@/lib/fila/servidor";
import { ordinal, podeEntrarNaFila, posicaoNaFila } from "@/lib/fila/regras";
import { Clock } from "lucide-react";
import { Estrela } from "../../estrela";
import { lerLoja } from "@/lib/loja/servidor";
import { promocoesDasPecas } from "@/lib/promocoes/servidor";
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

/** Preço com a promoção que vale hoje, se a peça estiver numa. */
const promocaoDa = cache(async (peca: { id: string; precoCentavos: number }) => (await promocoesDasPecas([peca])).get(peca.id) ?? null);

const dataBr = (t: string) => t.split("-").reverse().join("/");

export async function generateMetadata({ params }: PageProps<"/peca/[codigo]">): Promise<Metadata> {
  const peca = await buscarPeca((await params).codigo);
  if (!peca) return { title: "Peça não encontrada" };
  const loja = await lerLoja();
  const promocao = await promocaoDa(peca);
  const titulo = `${peca.nome} · ${formatarReais(promocao?.precoCentavos ?? peca.precoCentavos)} · ${loja.nome}`;
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
  const busca = await searchParams;
  // Fila de espera: só para peça reservada. Mostra a posição de quem já está na fila.
  const naFila = podeEntrarNaFila(peca.status) ? await filaDaPeca(peca.id) : [];
  const fichaId =
    naFila.length > 0 && quem.usuario
      ? (await prisma.cliente.findFirst({ where: { usuarioId: quem.usuario.id }, select: { id: true } }))?.id
      : undefined;
  const posicao = fichaId ? posicaoNaFila(naFila, fichaId) : null;
  const erroFila = typeof busca.erroFila === "string" ? busca.erroFila.slice(0, 200) : null;
  const biscoitos = await cookies();
  const noCarrinho = lerCarrinho(biscoitos.get(COOKIE_CARRINHO)?.value).includes(peca.id);
  // Grupo do link do post (?g=...) ou guardado de uma visita anterior.
  const codigoGrupo =
    lerCodigoGrupo(busca[PARAMETRO_GRUPO]) ?? lerCodigoGrupo(biscoitos.get(COOKIE_GRUPO)?.value);
  const grupo = codigoGrupo
    ? await prisma.grupoWhatsapp.findUnique({ where: { codigo: codigoGrupo }, select: { nome: true } })
    : null;
  const tamanho = TAMANHOS.find((t) => t.valor === peca.tamanho)?.nome ?? peca.tamanho;
  const conservacao = CONSERVACOES.find((c) => c.valor === peca.conservacao)?.nome;
  const categorias = peca.categorias.map((c) => c.categoria.nome).join(", ");
  const loja = await lerLoja();
  const promocao = await promocaoDa(peca);
  const preco = formatarReais(promocao?.precoCentavos ?? peca.precoCentavos);
  const whatsapp = linkWhatsapp(
    loja.whatsapp,
    mensagemDaPeca(
      {
        codigo: peca.codigo,
        nome: peca.nome,
        tamanho: peca.tamanho,
        preco,
      },
      origemDaRequisicao(await headers()),
      grupo?.nome,
    ),
  );
  const paraAmiga = linkCompartilharWhatsapp(
    mensagemParaAmiga(
      { codigo: peca.codigo, nome: peca.nome, tamanho: peca.tamanho, preco },
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
        <Link href="/" className={estilos.voltar}>
          <ArrowLeft className="icone" aria-hidden />
          Ver todas as peças
        </Link>
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
          {(conservacao || peca.marca) && <p className="sobretitulo">{[conservacao, peca.marca].filter(Boolean).join(" · ")}</p>}
          <h1>{peca.nome}</h1>
          <div className={estilos.precoEEstrela}>
            {promocao ? (
              <span className={estilos.precoPromocao}>
                <s aria-label={`Antes ${formatarReais(peca.precoCentavos)}`}>{formatarReais(peca.precoCentavos)}</s>
                <strong className={estilos.precoGrande}>{preco}</strong>
              </span>
            ) : (
              <strong className={estilos.precoGrande}>{preco}</strong>
            )}
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
          {promocao && (
            <p>
              <span className={estilos.seloPromocao}>{promocao.nome}</span> Promoção até {dataBr(promocao.fim)}
            </p>
          )}
          {!disponivel && <p className={estilos.reservada}>Esta peça está reservada para outra cliente no momento.</p>}
          {podeEntrarNaFila(peca.status) && (
            <section className={estilos.filaDeEspera} aria-label="Fila de espera">
              {erroFila && (
                <p className={estilos.erro} role="alert">
                  {erroFila}
                </p>
              )}
              {posicao ? (
                <>
                  <p role="status">
                    <Clock className="icone" aria-hidden /> Você está na fila de espera: é a <strong>{ordinal(posicao)}</strong>. Se a
                    reserva não for paga, a gente avisa você pelo WhatsApp.
                  </p>
                  <form action={sairDaFilaDeEspera}>
                    <input type="hidden" name="pecaId" value={peca.id} />
                    <button type="submit" className={estilos.botaoSimples}>
                      Sair da fila
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p>
                    <Clock className="icone" aria-hidden /> Ainda quer esta peça? Entre na fila de espera: se a reserva não for paga,
                    a gente avisa você pelo WhatsApp.
                    {naFila.length > 0 && ` ${naFila.length === 1 ? "1 pessoa já está" : `${naFila.length} pessoas já estão`} na fila.`}
                  </p>
                  <form action={entrarNaFilaDeEspera}>
                    <input type="hidden" name="pecaId" value={peca.id} />
                    <input type="hidden" name="voltar" value={enderecoDaPeca(peca.codigo)} />
                    <button type="submit" className={estilos.botaoWhats}>
                      Entrar na fila de espera
                    </button>
                  </form>
                </>
              )}
            </section>
          )}
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
              <div className={`${estilos.jaNoCarrinho} ${estilos.acaoFixa}`}>
                <span>
                  <Check className="icone" aria-hidden /> Esta peça está no seu carrinho.
                </span>
                <Link href="/carrinho" className={estilos.botaoWhats}>
                  <ShoppingBag className="icone" aria-hidden />
                  Ver carrinho e fechar pedido
                </Link>
              </div>
            ) : (
              <form action={incluir} className={estilos.acaoFixa}>
                <input type="hidden" name="id" value={peca.id} />
                <input type="hidden" name="voltar" value={enderecoDaPeca(peca.codigo)} />
                <strong className={estilos.precoNaBarra}>{preco}</strong>
                <button type="submit" className={estilos.botaoWhats}>
                  <ShoppingBag className="icone" aria-hidden />
                  Incluir no carrinho
                </button>
              </form>
            ))}
          {disponivel && whatsapp && (
            <a className={estilos.botaoContorno} href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="icone" aria-hidden />
              Tirar uma dúvida no WhatsApp
            </a>
          )}
          <a className={estilos.compartilhar} href={paraAmiga} target="_blank" rel="noopener noreferrer">
            <Share2 className="icone" aria-hidden />
            Compartilhar com alguém
          </a>
        </div>
      </article>
    </>
  );
}
