import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Gift, Timer, UserPlus } from "lucide-react";
import { prisma } from "@/lib/banco";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { campanhaPeloCodigo, ondeNaCampanha } from "@/lib/campanhas/servidor";
import { descricaoDeBoasVindas, descricaoDoCupom } from "@/lib/cupons/regras";
import { promocoesDasPecas } from "@/lib/promocoes/servidor";
import { ContagemRegressiva } from "@/componentes/contagem-regressiva";
import { CartaoPeca, SELECAO_CARTAO } from "../../cartao-peca";
import { quemVeALoja } from "../../quem-ve";
import estilos from "../../loja.module.css";

// Página da campanha (/c/<código>): as peças dos tamanhos da campanha que estão
// à venda, inclusive as "Não listado", que só quem tem este link vê. Nunca mostra
// fornecedora, custo ou repasse (os cartões são os mesmos da vitrine).

export async function generateMetadata({ params }: PageProps<"/c/[codigo]">): Promise<Metadata> {
  const c = await campanhaPeloCodigo((await params).codigo);
  // Página só para quem tem o link: fica fora do Google.
  return { title: c?.titulo ?? "Campanha", robots: { index: false, follow: false } };
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const aindaContando = (ate: Date) => ate.getTime() > Date.now();

export default async function PaginaDaCampanha({ params, searchParams }: PageProps<"/c/[codigo]">) {
  const campanha = await campanhaPeloCodigo((await params).codigo);
  if (!campanha) notFound();
  const voltar = `/c/${campanha.codigo}`;
  if (!campanha.ativa) {
    return (
      <section className={estilos.abertura}>
        <p className="sobretitulo">{campanha.nome}</p>
        <h1>Esta campanha terminou</h1>
        <p>Obrigada por participar! As peças que continuam à venda estão na loja.</p>
        <p>
          <Link href="/" className={estilos.botaoWhats}>
            Ver a loja
          </Link>
        </p>
      </section>
    );
  }
  await liberarReservasVencidas();
  const tamanhoPedido = (await searchParams).tamanho;
  const tamanho = campanha.tamanhos.find((t) => t === (Array.isArray(tamanhoPedido) ? tamanhoPedido[0] : tamanhoPedido));
  const onde = { ...ondeNaCampanha(campanha), ...(tamanho && { tamanho }) };
  const [pecas, porTamanho, cupom] = await Promise.all([
    prisma.peca.findMany({ where: onde, orderBy: [{ dataEntrada: "desc" }, { codigo: "desc" }], take: 120, select: SELECAO_CARTAO }),
    prisma.peca.groupBy({ by: ["tamanho"], where: ondeNaCampanha(campanha), _count: true }),
    campanha.cupom ? prisma.cupom.findUnique({ where: { codigo: campanha.cupom } }) : null,
  ]);
  const promocoes = await promocoesDasPecas(pecas);
  const quem = await quemVeALoja(pecas.map((p) => p.id));
  const quantos = new Map(porTamanho.map((t) => [t.tamanho, t._count]));
  const regrasDoCupom =
    cupom && cupom.ativo
      ? [
          descricaoDoCupom(cupom),
          descricaoDeBoasVindas({ ...cupom, cadastroDesde: iso(cupom.cadastroDesde), cadastroAte: iso(cupom.cadastroAte) }),
        ]
          .filter(Boolean)
          .join(", ")
      : null;

  return (
    <>
      <section className={estilos.abertura}>
        <p className="sobretitulo">{campanha.nome}</p>
        <h1>{campanha.titulo}</h1>
        {campanha.texto?.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
      </section>

      {(campanha.ate || (cupom && cupom.ativo)) && (
        <div className={estilos.campanhaCaixa}>
          {campanha.ate && aindaContando(campanha.ate) && (
            <p className={estilos.campanhaRelogio}>
              <Timer className="icone" aria-hidden />
              <span>
                Faltam <ContagemRegressiva ate={campanha.ate.toISOString()} />
              </span>
            </p>
          )}
          {cupom && cupom.ativo && (
            <p>
              <Gift className="icone" aria-hidden /> Cupom <strong>{cupom.codigo}</strong>: {regrasDoCupom}.
            </p>
          )}
          {quem.usuario ? (
            <p>
              <Check className="icone" aria-hidden /> Você já está cadastrada. É só escolher, usar o cupom no carrinho e fechar o pedido.
            </p>
          ) : (
            <p>
              <Link href={`/cadastro?voltar=${encodeURIComponent(voltar)}`} className={estilos.botaoWhats}>
                <UserPlus className="icone" aria-hidden />
                Criar minha conta
              </Link>{" "}
              <Link href={`/entrar?voltar=${encodeURIComponent(voltar)}`}>Já tenho conta</Link>
            </p>
          )}
        </div>
      )}

      {campanha.tamanhos.length > 1 && (
        <nav className={estilos.chipsCampanha} aria-label="Tamanhos">
          <Link href={voltar} aria-current={!tamanho ? "page" : undefined}>
            Todos
          </Link>
          {campanha.tamanhos.map((t) => (
            <Link key={t} href={`${voltar}?tamanho=${encodeURIComponent(t)}`} aria-current={tamanho === t ? "page" : undefined}>
              {t} ({quantos.get(t) ?? 0})
            </Link>
          ))}
        </nav>
      )}

      <p className={estilos.contagem}>
        {pecas.length === 0 ? "Nenhuma peça à venda agora." : pecas.length === 1 ? "1 peça" : `${pecas.length} peças`} · cada peça é
        única, quem fecha o pedido primeiro leva · <Link href="/como-comprar">Como comprar</Link>
      </p>

      {pecas.length > 0 && (
        <ul className={estilos.grade}>
          {pecas.map((p) => (
            <li key={p.id}>
              <CartaoPeca
                peca={p}
                promocao={promocoes.get(p.id)}
                favorita={quem.favoritas.has(p.id)}
                estrela={quem.estrela}
                voltar={tamanho ? `${voltar}?tamanho=${encodeURIComponent(tamanho)}` : voltar}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
