import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { fichaDaCliente } from "@/lib/clientes/contas";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { promocoesDasPecas } from "@/lib/promocoes/servidor";
import { CartaoPeca, SELECAO_CARTAO } from "../../cartao-peca";
import estilos from "../../loja.module.css";

export const metadata: Metadata = { title: "Meus favoritos" };

export default async function Favoritos() {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/favoritos");
  const ficha = await fichaDaCliente(usuario);
  await liberarReservasVencidas();
  const favoritos = await prisma.favorito.findMany({
    where: { clienteId: ficha.id },
    orderBy: { criadoEm: "desc" },
    select: { peca: { select: { ...SELECAO_CARTAO, status: true, quantidade: true } } },
  });
  const aVenda = favoritos.map((f) => f.peca).filter((p) => p.status === "publicada" && p.quantidade > 0);
  const reservadas = favoritos.map((f) => f.peca).filter((p) => p.status === "reservada");
  const sairam = favoritos.length - aVenda.length - reservadas.length;
  const promocoes = await promocoesDasPecas([...aVenda, ...reservadas]);

  if (favoritos.length === 0) {
    return (
      <p>
        Você ainda não tem favoritos. Na <Link href="/">vitrine</Link>, toque na estrela da peça para guardar aqui.
      </p>
    );
  }

  return (
    <>
      {aVenda.length > 0 && (
        <ul className={estilos.grade}>
          {aVenda.map((p) => (
            <li key={p.id}>
              <CartaoPeca peca={p} promocao={promocoes.get(p.id)} favorita estrela voltar="/minha-conta/favoritos" />
            </li>
          ))}
        </ul>
      )}
      {reservadas.length > 0 && (
        <section className={estilos.secao} aria-labelledby="titulo-reservadas">
          <h2 id="titulo-reservadas">Reservadas por outra cliente agora</h2>
          <p>Se o pagamento não for confirmado em 15 minutos, elas voltam para a vitrine.</p>
          <ul className={estilos.grade}>
            {reservadas.map((p) => (
              <li key={p.id}>
                <CartaoPeca peca={p} promocao={promocoes.get(p.id)} favorita estrela voltar="/minha-conta/favoritos" />
              </li>
            ))}
          </ul>
        </section>
      )}
      {sairam > 0 && (
        <p className={estilos.contagem}>
          {sairam === 1 ? "1 peça favorita já foi vendida." : `${sairam} peças favoritas já foram vendidas.`}
        </p>
      )}
    </>
  );
}
