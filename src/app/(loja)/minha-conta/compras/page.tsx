import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { fichaDaCliente } from "@/lib/clientes/contas";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import estilos from "../../loja.module.css";

export const metadata: Metadata = { title: "Minhas compras · Salty Baby" };

// Compras da cliente: só o que ela pagou. Nada de fornecedora, custo ou repasse.
export default async function Compras() {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta/compras");
  const ficha = await fichaDaCliente(usuario);
  const vendas = await prisma.venda.findMany({
    where: { clienteId: ficha.id },
    orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    select: {
      id: true,
      data: true,
      totalCentavos: true,
      itens: {
        select: {
          id: true,
          valorPagoCentavos: true,
          peca: {
            select: {
              codigo: true,
              nome: true,
              tamanho: true,
              marca: true,
              fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
            },
          },
        },
      },
    },
  });

  if (vendas.length === 0) {
    return <p>Você ainda não tem compras registradas nesta conta. Quando a loja confirmar um pagamento, a compra aparece aqui.</p>;
  }

  return (
    <section aria-label="Compras">
      {vendas.map((v) => (
        <article key={v.id} className={estilos.compra}>
          <header>
            <strong>{formatarData(v.data)}</strong>
            <span>
              {v.itens.length} peça(s) · Total {formatarReais(v.totalCentavos)}
            </span>
          </header>
          <ul className={estilos.itens}>
            {v.itens.map((i) => (
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
                    {[i.peca.codigo, i.peca.tamanho && `Tam. ${i.peca.tamanho}`, i.peca.marca].filter(Boolean).join(" · ")}
                  </span>
                  <strong className={estilos.preco}>{formatarReais(i.valorPagoCentavos)}</strong>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
