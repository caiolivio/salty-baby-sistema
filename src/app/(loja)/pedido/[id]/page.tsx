import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/banco";
import { formatarHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { mensagemDoPedido, minutosRestantes } from "@/lib/pedidos/regras";
import { enderecoDaPeca, linkWhatsapp } from "@/lib/vitrine";
import estilos from "../../loja.module.css";
import { AbrirWhatsapp } from "./abrir-whatsapp";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = {
  title: "Pedido",
  robots: { index: false },
};

// O endereço do pedido leva um id impossível de adivinhar; só quem fechou o
// pedido o recebe. Não mostra nada além do que a própria cliente escolheu.
export default async function Pedido({ params, searchParams }: PageProps<"/pedido/[id]">) {
  const { id } = await params;
  const { novo } = await searchParams;
  await liberarReservasVencidas();
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    select: {
      numero: true,
      nomeCliente: true,
      status: true,
      reservadoAte: true,
      totalCentavos: true,
      cupomCodigo: true,
      descontoCupomCentavos: true,
      naSacolinha: true,
      creditoFornecedora: { select: { codigo: true } },
      itens: {
        orderBy: { ordem: "asc" },
        select: {
          precoCentavos: true,
          descontoCentavos: true,
          peca: { select: { codigo: true, nome: true, tamanho: true } },
        },
      },
    },
  });
  if (!pedido) notFound();

  const total = formatarReais(pedido.totalCentavos);
  const loja = await lerLoja();
  const link = linkWhatsapp(
    loja.whatsapp,
    mensagemDoPedido(
      {
        numero: pedido.numero,
        nomeCliente: pedido.nomeCliente,
        total,
        saldoDe: pedido.creditoFornecedora?.codigo,
        sacolinha: pedido.naSacolinha,
        cupom:
          pedido.cupomCodigo && pedido.descontoCupomCentavos > 0
            ? { codigo: pedido.cupomCodigo, desconto: formatarReais(pedido.descontoCupomCentavos) }
            : null,
        itens: pedido.itens.map((i) => ({
          ...i.peca,
          preco: i.descontoCentavos
            ? `${formatarReais(i.precoCentavos - i.descontoCentavos)} (de ${formatarReais(i.precoCentavos)})`
            : formatarReais(i.precoCentavos),
        })),
      },
      origemDaRequisicao(await headers()),
      loja.minutosReserva,
    ),
  );
  const reservado = pedido.status === "reservado";

  return (
    <>
      <h1 className={estilos.tituloPagina}>Pedido nº {pedido.numero}</h1>
      {reservado && (
        <p className={estilos.reservaAtiva} role="status">
          Suas peças estão reservadas até <strong>{formatarHora(pedido.reservadoAte)}</strong> (faltam{" "}
          {minutosRestantes(pedido.reservadoAte, new Date())} min). Envie o pedido pelo WhatsApp para combinar o pagamento.
        </p>
      )}
      {pedido.status === "expirado" && (
        <p className={estilos.aviso}>
          A reserva deste pedido venceu e as peças voltaram para a vitrine. Se ainda quiser, fale com a loja pelo WhatsApp.
        </p>
      )}
      {pedido.status === "cancelado" && <p className={estilos.aviso}>Este pedido foi cancelado.</p>}
      {pedido.status === "pago" && <p className={estilos.reservaAtiva}>Pagamento confirmado. Obrigada!</p>}

      <ul className={estilos.itens}>
        {pedido.itens.map((i) => (
          <li key={i.peca.codigo}>
            <div>
              <Link href={enderecoDaPeca(i.peca.codigo)} className={estilos.nome}>
                {i.peca.nome}
              </Link>
              <span className={estilos.detalhe}>
                {[i.peca.codigo, i.peca.tamanho && `Tam. ${i.peca.tamanho}`].filter(Boolean).join(" · ")}
              </span>
            </div>
            {i.descontoCentavos ? (
              <span className={estilos.precoPromocao}>
                <s aria-label={`Antes ${formatarReais(i.precoCentavos)}`}>{formatarReais(i.precoCentavos)}</s>
                <strong className={estilos.preco}>{formatarReais(i.precoCentavos - i.descontoCentavos)}</strong>
              </span>
            ) : (
              <strong className={estilos.preco}>{formatarReais(i.precoCentavos)}</strong>
            )}
          </li>
        ))}
      </ul>
      {pedido.cupomCodigo && pedido.descontoCupomCentavos > 0 && (
        <p>
          Cupom {pedido.cupomCodigo}: −{formatarReais(pedido.descontoCupomCentavos)}
        </p>
      )}
      <p className={estilos.total}>
        Total: <strong>{total}</strong>
      </p>
      {pedido.naSacolinha && pedido.status !== "cancelado" && (
        <p className={estilos.avisoSacolinha}>
          Depois do pagamento, as peças ficam guardadas na sua sacolinha. Você pode juntar outros pedidos e pagar um frete só.
          Se o envio não for pedido em {loja.mesesSacolinha} meses, as peças são doadas.
        </p>
      )}

      {link && pedido.status !== "cancelado" && (
        <p className={estilos.acoesPedido}>
          <a className={estilos.botaoWhats} href={link}>
            Enviar pedido pelo WhatsApp
          </a>
        </p>
      )}
      {link && reservado && novo === "1" && <AbrirWhatsapp link={link} />}
      <p>
        <Link href="/">Voltar para a vitrine</Link>
      </p>
    </>
  );
}
