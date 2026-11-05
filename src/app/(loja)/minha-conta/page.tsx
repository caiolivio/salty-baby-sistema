import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Heart, Receipt, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/banco";
import { fichaDaCliente } from "@/lib/clientes/contas";
import { escolherSugestoes, preferenciasDaCliente } from "@/lib/clientes/sugestoes";
import { exigirAcesso } from "@/lib/acesso";
import { formatarReais } from "@/lib/dinheiro";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { COOKIE_CARRINHO, lerCarrinho } from "@/lib/pedidos/regras";
import { promocoesDasPecas } from "@/lib/promocoes/servidor";
import { CartaoPeca, SELECAO_CARTAO } from "../cartao-peca";
import { tamanhoDaCrianca } from "@/lib/clientes/perfil";
import { Baby, MessageCircle } from "lucide-react";
import { headers } from "next/headers";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { lerLoja } from "@/lib/loja/servidor";
import { campanhaAtiva } from "@/lib/campanhas/servidor";
import { codigoDeIndicacaoDa, indicadasPor } from "@/lib/clientes/indicacao-servidor";
import { linkDeIndicacao, mensagemParaIndicar, MIMO_PADRAO } from "@/lib/clientes/indicacao";
import { CopiarTexto } from "@/componentes/copiar-texto";
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
    prisma.crianca.findMany({
      where: { clienteId: ficha.id },
      orderBy: [{ nascimento: "asc" }, { criadoEm: "asc" }],
      select: { id: true, nome: true, sexo: true, nascimento: true, tamanho: true, tamanhoEm: true },
    }),
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
    tamanhosAtuais: criancas.flatMap((c) => tamanhoDaCrianca(c, hoje) ?? []),
    hoje,
  });
  const favoritas = new Set(favoritos.map((f) => f.pecaId));
  const sugestoes = escolherSugestoes(
    candidatas.map((p) => ({ ...p, categorias: nomes(p.categorias) })),
    gosto,
    favoritas,
  );
  const promocoes = await promocoesDasPecas(sugestoes.pecas);
  const noCarrinho = lerCarrinho((await cookies()).get(COOKIE_CARRINHO)?.value).length;
  const [loja, campanha, codigo, amigas] = await Promise.all([lerLoja(), campanhaAtiva(), codigoDeIndicacaoDa(ficha.id), indicadasPor(ficha.id)]);
  const linkIndicacao = linkDeIndicacao(origemDaRequisicao(await headers()), codigo);

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

      <section className={estilos.secao} aria-labelledby="titulo-criancas">
        <h2 id="titulo-criancas">Para as suas crianças</h2>
        {criancas.length === 0 ? (
          <p>
            <Baby className="icone" aria-hidden /> Conte em <Link href="/minha-conta/perfil#titulo-criancas">Meus dados</Link> o
            tamanho ou o nascimento das suas crianças, e a gente mostra o que serve nelas.
          </p>
        ) : (
          <ul className={estilos.atalhosCriancas}>
            {criancas.map((c) => {
              const tamanho = tamanhoDaCrianca(c, hoje);
              const publico = c.sexo === "feminino" ? "menina" : c.sexo === "masculino" ? "menino" : null;
              const busca = new URLSearchParams({ ...(tamanho && { tamanho }), ...(publico && { publico }) });
              return (
                <li key={c.id}>
                  <Link href={`/?${busca.toString()}`}>
                    <Baby className="icone" aria-hidden />
                    <span>
                      <strong>{c.nome}</strong>
                      {tamanho ? `Ver peças no tamanho ${tamanho}` : "Ver peças"}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/minha-conta/perfil#titulo-criancas" className={estilos.botaoSimples}>
                Mudar as crianças
              </Link>
            </li>
          </ul>
        )}
      </section>

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
                <CartaoPeca peca={p} promocao={promocoes.get(p.id)} favorita={false} estrela voltar="/minha-conta" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-indicar">
        <h2 id="titulo-indicar">Indique uma amiga</h2>
        <p>
          Mande o seu link para uma amiga. Quando ela se cadastrar por ele e fizer a primeira compra, você ganha{" "}
          {loja.mimoIndicacao?.trim() || MIMO_PADRAO}.
          {amigas.length > 0 &&
            ` ${amigas.length === 1 ? "1 amiga já se cadastrou" : `${amigas.length} amigas já se cadastraram`} pelo seu link${
              amigas.some((a) => a.comprou) ? `, e ${amigas.filter((a) => a.comprou).length} já comprou` : ""
            }.`}
        </p>
        <div className={estilos.acoesIndicar}>
          <a
            className={estilos.botaoWhats}
            href={`https://wa.me/?text=${encodeURIComponent(mensagemParaIndicar({ nomeLoja: loja.nome, link: linkIndicacao, cupom: campanha?.cupom }))}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="icone" aria-hidden />
            Indicar no WhatsApp
          </a>
          <CopiarTexto texto={linkIndicacao} className={estilos.botaoSimples} />
        </div>
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-resumo">
        <h2 id="titulo-resumo">Sua conta</h2>
        <div className={estilos.saldos}>
          <Link href="/carrinho" className={`${estilos.saldo} ${estilos.saldoLink}`}>
            <ShoppingBag className="icone" aria-hidden />
            <span>Carrinho</span>
            <strong>{noCarrinho === 0 ? "Vazio" : `${noCarrinho} peça(s)`}</strong>
          </Link>
          <Link href="/minha-conta/favoritos" className={`${estilos.saldo} ${estilos.saldoLink}`}>
            <Heart className="icone" aria-hidden />
            <span>Favoritos</span>
            <strong>{favoritos.length} peça(s)</strong>
          </Link>
          <Link href="/minha-conta/compras" className={`${estilos.saldo} ${estilos.saldoLink}`}>
            <Receipt className="icone" aria-hidden />
            <span>Compras</span>
            <strong>{compras.length} peça(s)</strong>
          </Link>
        </div>
      </section>
    </>
  );
}
