import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";
import { usuarioAtual } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { clienteDoUsuario } from "@/lib/clientes/contas";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { saldoParaCompras } from "@/lib/fornecedoras/saldo-para-compras";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { COOKIE_CARRINHO, formatarTelefone, lerCarrinho } from "@/lib/pedidos/regras";
import { COOKIE_CUPOM, lerCodigoDoCupom } from "@/lib/cupons/regras";
import { cupomNoCarrinho } from "@/lib/cupons/servidor";
import { promocoesDasPecas } from "@/lib/promocoes/servidor";
import { enderecoDaPeca } from "@/lib/vitrine";
import estilos from "../loja.module.css";
import { tirar, tirarCupom, usarCupom } from "./acoes";
import { FecharPedido } from "./fechar-pedido";

export const metadata: Metadata = { title: "Carrinho" };

export default async function Carrinho({ searchParams }: PageProps<"/carrinho">) {
  const biscoitos = await cookies();
  const ids = lerCarrinho(biscoitos.get(COOKIE_CARRINHO)?.value);
  const codigoCupom = lerCodigoDoCupom(biscoitos.get(COOKIE_CUPOM)?.value);
  const cupomInvalido = (await searchParams).cupom === "invalido";
  await liberarReservasVencidas();
  const encontradas = await prisma.peca.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      codigo: true,
      nome: true,
      tamanho: true,
      status: true,
      quantidade: true,
      precoCentavos: true,
      // Só para conferir o cupom no servidor; não aparecem na página.
      marca: true,
      genero: true,
      fornecedoraId: true,
      fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
    },
  });
  const pecas = ids.flatMap((id) => encontradas.filter((p) => p.id === id));
  const disponivel = (p: (typeof pecas)[number]) => p.status === "publicada" && p.quantidade > 0;
  const promocoes = await promocoesDasPecas(pecas);
  const preco = (p: (typeof pecas)[number]) => promocoes.get(p.id)?.precoCentavos ?? p.precoCentavos;
  const total = pecas.filter(disponivel).reduce((soma, p) => soma + preco(p), 0);
  const economia = pecas.filter(disponivel).reduce((soma, p) => soma + (promocoes.get(p.id)?.descontoCentavos ?? 0), 0);
  const todasDisponiveis = pecas.length > 0 && pecas.every(disponivel);
  // Cliente logada: nome e WhatsApp já vêm preenchidos, e o pedido fica na conta dela.
  const usuario = await usuarioAtual();
  const ficha = usuario ? await clienteDoUsuario(usuario.id) : null;
  // Fornecedora logada: pode pagar com o saldo dela.
  const fornecedora = usuario ? await prisma.fornecedora.findFirst({ where: { usuarioId: usuario.id }, select: { id: true } }) : null;
  const saldo = fornecedora ? (await saldoParaCompras(fornecedora.id)).disponivelCentavos : 0;
  const cupom =
    codigoCupom && pecas.some(disponivel)
      ? await cupomNoCarrinho(
          codigoCupom,
          pecas.filter(disponivel).map((p) => ({ ...p, precoCentavos: preco(p) })),
          ficha?.id ?? null,
        )
      : null;
  const descontoCupom = cupom?.ok ? cupom.cupom.descontoCentavos : 0;
  const aPagar = total - descontoCupom;

  return (
    <>
      <p>
        <Link href="/" className={estilos.voltar}>
          <ArrowLeft className="icone" aria-hidden />
          Continuar escolhendo
        </Link>
      </p>
      <h1 className={estilos.tituloPagina}>
        Seu carrinho
        {pecas.length > 0 && <span className={estilos.qtdTitulo}> · {pecas.length === 1 ? "1 peça" : `${pecas.length} peças`}</span>}
      </h1>
      {pecas.length === 0 ? (
        <div className={estilos.vazio}>
          <ShoppingBag className="icone" aria-hidden />
          <p>Seu carrinho está vazio. Escolha as peças na vitrine e toque em &quot;Incluir no carrinho&quot;.</p>
          <Link href="/" className={estilos.botaoWhats}>
            Ver peças
          </Link>
        </div>
      ) : (
        <div className={estilos.carrinho}>
          <ul className={estilos.itens}>
            {pecas.map((p) => (
              <li key={p.id} className={disponivel(p) ? undefined : estilos.saiu}>
                <Link href={enderecoDaPeca(p.codigo)}>
                  {p.fotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura
                    <img src={enderecoDaFoto(p.fotos[0].arquivo, true)} alt="" />
                  ) : (
                    <span className={estilos.semFoto} />
                  )}
                </Link>
                <div>
                  <Link href={enderecoDaPeca(p.codigo)} className={estilos.nome}>
                    {p.nome}
                  </Link>
                  <span className={estilos.detalhe}>{[p.codigo, p.tamanho && `Tam. ${p.tamanho}`].filter(Boolean).join(" · ")}</span>
                  {disponivel(p) ? (
                    promocoes.has(p.id) ? (
                      <span className={estilos.precoPromocao}>
                        <s aria-label={`Antes ${formatarReais(p.precoCentavos)}`}>{formatarReais(p.precoCentavos)}</s>
                        <strong className={estilos.preco}>{formatarReais(preco(p))}</strong>
                      </span>
                    ) : (
                      <strong className={estilos.preco}>{formatarReais(p.precoCentavos)}</strong>
                    )
                  ) : (
                    <span className={estilos.aviso}>Esta peça não está mais disponível.</span>
                  )}
                </div>
                <form action={tirar}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className={estilos.tirar} aria-label={`Tirar ${p.nome} do carrinho`}>
                    <Trash2 className="icone" aria-hidden />
                    <span>Tirar</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <aside className={estilos.resumo}>
            {codigoCupom ? (
              <div className={estilos.cupom}>
                <p>
                  <span>
                    Cupom <strong>{codigoCupom}</strong>
                  </span>
                  {cupom?.ok && <strong>−{formatarReais(descontoCupom)}</strong>}
                </p>
                {cupom && !cupom.ok && <p className={estilos.aviso}>{cupom.erro}</p>}
                <form action={tirarCupom}>
                  <button type="submit" className={estilos.linkBotao}>
                    Tirar cupom
                  </button>
                </form>
              </div>
            ) : (
              <form action={usarCupom} className={estilos.cupomForm}>
                <label>
                  Cupom de desconto
                  <span>
                    <input name="cupom" maxLength={30} autoCapitalize="characters" autoComplete="off" placeholder="Código" required />
                    <button type="submit">Aplicar</button>
                  </span>
                </label>
                {cupomInvalido && <p className={estilos.aviso}>Confira o código: use só letras e números, sem espaços.</p>}
              </form>
            )}
            <p className={estilos.total}>
              <span>Total</span> <strong>{formatarReais(aPagar)}</strong>
            </p>
            {economia + descontoCupom > 0 && (
              <p className={estilos.economia}>
                Você economiza {formatarReais(economia + descontoCupom)}
                {economia > 0 && descontoCupom > 0 ? " com a promoção e o cupom." : economia > 0 ? " com a promoção." : " com o cupom."}
              </p>
            )}
            {todasDisponiveis ? (
              <>
                <FecharPedido
                  nome={ficha?.nome}
                  telefone={ficha?.telefone ? formatarTelefone(ficha.telefone) : undefined}
                  saldoCentavos={saldo}
                  totalCentavos={aPagar}
                />
                {!usuario && (
                  <p className={estilos.dica}>
                    <Link href="/entrar?voltar=/carrinho">Entre na sua conta</Link> ou{" "}
                    <Link href="/cadastro?voltar=/carrinho">crie uma</Link> para o pedido ficar guardado nas suas compras.
                  </p>
                )}
              </>
            ) : (
              <p className={estilos.aviso}>Tire do carrinho as peças que não estão mais disponíveis para fechar o pedido.</p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
