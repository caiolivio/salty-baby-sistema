import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { usuarioAtual } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { clienteDoUsuario } from "@/lib/clientes/contas";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { COOKIE_CARRINHO, formatarTelefone, lerCarrinho } from "@/lib/pedidos/regras";
import { enderecoDaPeca } from "@/lib/vitrine";
import estilos from "../loja.module.css";
import { tirar } from "./acoes";
import { FecharPedido } from "./fechar-pedido";

export const metadata: Metadata = { title: "Carrinho" };

export default async function Carrinho() {
  const ids = lerCarrinho((await cookies()).get(COOKIE_CARRINHO)?.value);
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
      fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
    },
  });
  const pecas = ids.flatMap((id) => encontradas.filter((p) => p.id === id));
  const disponivel = (p: (typeof pecas)[number]) => p.status === "publicada" && p.quantidade > 0;
  const total = pecas.filter(disponivel).reduce((soma, p) => soma + p.precoCentavos, 0);
  const todasDisponiveis = pecas.length > 0 && pecas.every(disponivel);
  // Cliente logada: nome e WhatsApp já vêm preenchidos, e o pedido fica na conta dela.
  const usuario = await usuarioAtual();
  const ficha = usuario ? await clienteDoUsuario(usuario.id) : null;

  return (
    <>
      <p>
        <Link href="/">← Continuar escolhendo</Link>
      </p>
      <h1 className={estilos.tituloPagina}>Seu carrinho</h1>
      {pecas.length === 0 ? (
        <p className={estilos.comoComprar}>
          Seu carrinho está vazio. Escolha as peças na vitrine e toque em &quot;Incluir no carrinho&quot;.
        </p>
      ) : (
        <>
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
                  <span className={estilos.detalhe}>
                    {[p.codigo, p.tamanho && `Tam. ${p.tamanho}`].filter(Boolean).join(" · ")}
                  </span>
                  {disponivel(p) ? (
                    <strong className={estilos.preco}>{formatarReais(p.precoCentavos)}</strong>
                  ) : (
                    <span className={estilos.aviso}>Esta peça não está mais disponível.</span>
                  )}
                </div>
                <form action={tirar}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className={estilos.tirar}>
                    Tirar
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className={estilos.total}>
            Total: <strong>{formatarReais(total)}</strong>
          </p>
          {todasDisponiveis ? (
            <>
              <FecharPedido
                nome={ficha?.nome}
                telefone={ficha?.telefone ? formatarTelefone(ficha.telefone) : undefined}
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
        </>
      )}
    </>
  );
}
