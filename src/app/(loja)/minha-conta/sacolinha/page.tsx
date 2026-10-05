import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { fichaDaCliente } from "@/lib/clientes/contas";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { lerLoja } from "@/lib/loja/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import {
  avisoDeDoacao,
  enderecoDeEntrega,
  explicacaoDaSacolinha,
  mensagemPedirEnvio,
  situacaoDoPrazo,
  SITUACOES_SACOLINHA,
  textoDoPrazo,
} from "@/lib/sacolinhas/regras";
import { linkWhatsapp } from "@/lib/vitrine";
import estilos from "../../loja.module.css";
import { pedirEnvioDaSacolinha } from "../acoes";

export const metadata: Metadata = { title: "Minha sacolinha" };

// Sacolinha da cliente: peças já pagas guardadas na loja, o prazo, o aviso de
// doação e o "Pedir envio". Nada de fornecedora, custo ou repasse.
export default async function MinhaSacolinha({ searchParams }: PageProps<"/minha-conta/sacolinha">) {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/sacolinha");
  const ficha = await fichaDaCliente(usuario);
  const { envio, erro } = await searchParams;
  const [sacolinhas, cliente, loja] = await Promise.all([
    prisma.sacolinha.findMany({
      where: { clienteId: ficha.id },
      orderBy: { abertaEm: "desc" },
      take: 20,
      select: {
        id: true,
        situacao: true,
        prazo: true,
        envioPedidoEm: true,
        fechadaEm: true,
        itens: {
          orderBy: { venda: { data: "asc" } },
          select: {
            id: true,
            valorPagoCentavos: true,
            peca: {
              select: {
                codigo: true,
                nome: true,
                tamanho: true,
                status: true,
                fotos: {
                  orderBy: { ordem: "asc" },
                  take: 1,
                  select: { arquivo: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.cliente.findUniqueOrThrow({
      where: { id: ficha.id },
      select: { endereco: true, cidade: true, estado: true, cep: true },
    }),
    lerLoja(),
  ]);
  const hoje = hojeEmSaoPaulo();
  const guardadas = sacolinhas.filter((s) => s.situacao === "aberta" || s.situacao === "envio_pedido");
  const fechadas = sacolinhas.filter((s) => !guardadas.includes(s));
  const endereco = enderecoDeEntrega(cliente);

  return (
    <section aria-label="Sacolinha">
      <details className={estilos.explicaSacolinha} open>
        <summary>O que é a sacolinha?</summary>
        {explicacaoDaSacolinha(loja.nomeCurto, loja.mesesSacolinha).map((t) => (
          <p key={t}>{t}</p>
        ))}
      </details>
      {typeof erro === "string" && (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      )}
      {envio && (
        <p className={estilos.reservaAtiva} role="status">
          Pedido de envio registrado! Agora mande a mensagem no WhatsApp para combinar o frete.
        </p>
      )}
      {guardadas.length === 0 && (
        <div className={estilos.vazio}>
          <ShoppingBag className="icone" aria-hidden />
          <p>Sua sacolinha está vazia. Ao fechar um pedido, escolha &quot;Colocar na sacolinha&quot;.</p>
        </div>
      )}
      {guardadas.map((s) => {
        const pecas = s.itens.filter((i) => i.peca.status === "na_sacolinha");
        const vencida = situacaoDoPrazo(s.prazo, hoje).tipo === "vencida";
        const mensagem = linkWhatsapp(
          loja.whatsapp,
          mensagemPedirEnvio({
            nomeCliente: ficha.nome,
            pecas: pecas.map((i) => i.peca),
            endereco,
          }),
        );
        return (
          <article key={s.id} className={estilos.compra}>
            <header>
              <strong>{s.situacao === "envio_pedido" ? "Envio pedido" : "Sua sacolinha"}</strong>
              <span>{textoDoPrazo(s.prazo, hoje)}</span>
            </header>
            {s.situacao === "aberta" && (
              <p className={vencida ? estilos.erro : estilos.avisoSacolinha}>
                {vencida
                  ? `O prazo venceu em ${formatarData(s.prazo)}. Fale com a ${loja.nomeCurto} o quanto antes: as peças vão ser doadas.`
                  : avisoDeDoacao(s.prazo, loja.nomeCurto)}
              </p>
            )}
            <ul className={estilos.itens}>
              {s.itens.map((i) => (
                <li key={i.id}>
                  {i.peca.fotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura
                    <img src={enderecoDaFoto(i.peca.fotos[0].arquivo, true)} alt="" />
                  ) : (
                    <span className={estilos.semFoto} />
                  )}
                  <div>
                    <span className={estilos.nome}>{i.peca.nome}</span>
                    <span className={estilos.detalhe}>
                      {[
                        i.peca.codigo,
                        i.peca.tamanho && `Tam. ${i.peca.tamanho}`,
                        i.peca.status !== "na_sacolinha" && "já entregue",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <strong className={estilos.preco}>{formatarReais(i.valorPagoCentavos)}</strong>
                  </div>
                </li>
              ))}
            </ul>
            {s.situacao === "aberta" ? (
              <form action={pedirEnvioDaSacolinha}>
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" className={estilos.botaoWhats} disabled={pecas.length === 0}>
                  <ShoppingBag className="icone" aria-hidden />
                  Pedir envio
                </button>
                <p className={estilos.detalhe}>
                  Depois de pedir o envio, as próximas compras vão para uma sacolinha nova.
                  {endereco ? ` Endereço de entrega: ${endereco}.` : " Cadastre o endereço em Meus dados ou mande no WhatsApp."}
                </p>
              </form>
            ) : (
              <>
                {s.envioPedidoEm && (
                  <p>Você pediu o envio em {formatarDataHora(s.envioPedidoEm)}. A loja vai combinar o frete com você.</p>
                )}
                {mensagem && (
                  <a className={estilos.botaoWhats} href={mensagem} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="icone" aria-hidden />
                    Combinar o frete no WhatsApp
                  </a>
                )}
              </>
            )}
          </article>
        );
      })}
      {fechadas.length > 0 && (
        <>
          <h2>Sacolinhas anteriores</h2>
          <ul>
            {fechadas.map((s) => (
              <li key={s.id}>
                {SITUACOES_SACOLINHA[s.situacao]}
                {s.fechadaEm && ` em ${formatarData(s.fechadaEm)}`} · {s.itens.length} peça(s)
              </li>
            ))}
          </ul>
        </>
      )}
      <p>
        <Link href="/minha-conta/compras">Ver todas as compras</Link>
      </p>
    </section>
  );
}
