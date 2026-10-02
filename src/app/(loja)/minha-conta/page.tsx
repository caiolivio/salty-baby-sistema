import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/banco";
import { fichaDaCliente } from "@/lib/clientes/contas";
import { escolherSugestoes, preferenciasDaCliente } from "@/lib/clientes/sugestoes";
import { exigirAcesso } from "@/lib/acesso";
import { formatarReais } from "@/lib/dinheiro";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { COOKIE_CARRINHO, lerCarrinho } from "@/lib/pedidos/regras";
import { CartaoPeca, SELECAO_CARTAO } from "../cartao-peca";
import estilos from "../loja.module.css";

export const metadata: Metadata = { title: "Minha conta" };

const nomes = (categorias: { categoria: { nome: string } }[]) => categorias.map((c) => c.categoria.nome);

export default async function MinhaConta() {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta");
  const ficha = await fichaDaCliente(usuario);
  await liberarReservasVencidas();
  const hoje = new Date();
  const doHistorico = { tamanho: true, marca: true, categorias: { select: { categoria: { select: { nome: true } } } } };

  const [compras, favoritos, criancas, candidatas, pedidos] = await Promise.all([
    prisma.itemVenda.findMany({
      where: { venda: { clienteId: ficha.id } },
      orderBy: { venda: { data: "desc" } },
      take: 60,
      select: { venda: { select: { data: true } }, peca: { select: doHistorico } },
    }),
    prisma.favorito.findMany({
      where: { clienteId: ficha.id },
      select: { pecaId: true, criadoEm: true, peca: { select: doHistorico } },
    }),
    prisma.crianca.findMany({ where: { clienteId: ficha.id, nascimento: { not: null } }, select: { nascimento: true } }),
    prisma.peca.findMany({
      where: { status: "publicada", naoListada: false, quantidade: { gt: 0 } },
      select: { ...SELECAO_CARTAO, marca: true, dataEntrada: true, categorias: doHistorico.categorias },
    }),
    prisma.pedido.findMany({
      where: { clienteId: ficha.id, status: "reservado" },
      orderBy: { criadoEm: "desc" },
      select: { id: true, numero: true, totalCentavos: true, reservadoAte: true },
    }),
  ]);

  const gosto = preferenciasDaCliente({
    compras: compras.map((c) => ({ ...c.peca, categorias: nomes(c.peca.categorias), data: c.venda.data })),
    favoritos: favoritos.map((f) => ({ ...f.peca, categorias: nomes(f.peca.categorias), data: f.criadoEm })),
    nascimentos: criancas.flatMap((c) => (c.nascimento ? [c.nascimento] : [])),
    hoje,
  });
  const favoritas = new Set(favoritos.map((f) => f.pecaId));
  const sugestoes = escolherSugestoes(
    candidatas.map((p) => ({ ...p, categorias: nomes(p.categorias) })),
    gosto,
    favoritas,
  );
  const noCarrinho = lerCarrinho((await cookies()).get(COOKIE_CARRINHO)?.value).length;

  return (
    <>
      {pedidos.length > 0 && (
        <section className={estilos.secao} aria-labelledby="titulo-pedidos">
          <h2 id="titulo-pedidos">Pedido aguardando pagamento</h2>
          <ul>
            {pedidos.map((p) => (
              <li key={p.id}>
                <Link href={`/pedido/${p.id}`}>
                  Pedido nº {p.numero} · {formatarReais(p.totalCentavos)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={estilos.secao} aria-labelledby="titulo-sugestoes">
        <h2 id="titulo-sugestoes">{sugestoes.personalizadas ? "Escolhidas para você" : "Novidades da loja"}</h2>
        <p>
          {sugestoes.personalizadas
            ? "Peças à venda no tamanho, nas categorias e nas marcas das suas compras e dos seus favoritos."
            : "Quando você comprar ou marcar favoritos, aqui aparecem peças escolhidas para você."}
        </p>
        {sugestoes.pecas.length === 0 ? (
          <p>Nenhuma peça à venda agora.</p>
        ) : (
          <ul className={estilos.carrossel}>
            {sugestoes.pecas.map((p) => (
              <li key={p.id}>
                <CartaoPeca peca={p} favorita={false} estrela voltar="/minha-conta" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-resumo">
        <h2 id="titulo-resumo">Sua conta</h2>
        <ul>
          <li>
            <Link href="/carrinho">Carrinho</Link>: {noCarrinho === 0 ? "vazio" : `${noCarrinho} peça(s)`}
          </li>
          <li>
            <Link href="/minha-conta/favoritos">Favoritos</Link>: {favoritos.length} peça(s)
          </li>
          <li>
            <Link href="/minha-conta/compras">Compras</Link>: {compras.length} peça(s)
          </li>
        </ul>
      </section>
    </>
  );
}
