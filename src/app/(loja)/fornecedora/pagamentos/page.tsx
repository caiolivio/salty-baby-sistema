import type { Metadata } from "next";
import Link from "next/link";
import { nomeDaFormaAcerto } from "@/lib/acertos/regras";
import { prisma } from "@/lib/banco";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { lerLoja } from "@/lib/loja/servidor";
import estilos from "../../loja.module.css";
import { exigirFornecedoraLiberada } from "../liberada";

export const metadata: Metadata = { title: "Pagamentos", robots: { index: false } };

export default async function MeusPagamentos() {
  const { fornecedora } = await exigirFornecedoraLiberada("/fornecedora/pagamentos");
  const [acertos, loja] = await Promise.all([
    prisma.acerto.findMany({
      where: { fornecedoraId: fornecedora.id, canceladoEm: null },
      orderBy: [{ data: "desc" }, { numero: "desc" }],
      select: { id: true, numero: true, data: true, forma: true, totalCentavos: true, abatidoCentavos: true, pecas: true },
    }),
    lerLoja(),
  ]);
  // Compras com o saldo e bônus (o desconto no acerto já aparece no comprovante).
  const movimentos = await prisma.movimentoCredito.findMany({
    where: { fornecedoraId: fornecedora.id, tipo: { in: ["compra", "bonus"] } },
    orderBy: { criadoEm: "desc" },
    take: 100,
    select: { id: true, tipo: true, repasseCentavos: true, bonusCentavos: true, descricao: true, criadoEm: true },
  });

  return (
    <>
      <h1 className={estilos.tituloPagina}>Pagamentos ({acertos.length})</h1>
      <p className={estilos.dica}>
        Os repasses que a {loja.nomeCurto} já pagou para você, com o comprovante de cada pagamento e as peças vendidas.
      </p>
      {acertos.length === 0 ? (
        <p>Nenhum pagamento registrado ainda.</p>
      ) : (
        <ul className={estilos.listaVendasArea}>
          {acertos.map((a) => (
            <li key={a.id}>
              <div>
                <Link href={`/fornecedora/pagamentos/${a.id}`}>
                  <strong>Comprovante nº {a.numero}</strong>
                </Link>
                <br />
                Pago em {formatarData(a.data)} ({nomeDaFormaAcerto(a.forma)}) · {a.pecas} {a.pecas === 1 ? "peça" : "peças"}
              </div>
              <div className={estilos.numero}>
                <strong>{formatarReais(a.totalCentavos - a.abatidoCentavos)}</strong>
                {a.abatidoCentavos > 0 && (
                  <>
                    <br />
                    <small>repasse {formatarReais(a.totalCentavos)}, menos compras</small>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {movimentos.length > 0 && (
        <>
          <h2>Compras com o saldo</h2>
          <p className={estilos.dica}>
            O que você usou do seu saldo em compras na {loja.nomeCurto} e os bônus que ganhou. O valor usado é descontado do próximo
            pagamento.
          </p>
          <ul className={estilos.listaVendasArea}>
            {movimentos.map((m) => {
              const valor = m.repasseCentavos + m.bonusCentavos;
              return (
                <li key={m.id}>
                  <div>
                    <strong>{m.tipo === "bonus" ? "Bônus" : "Compra"}</strong>
                    <br />
                    {m.descricao} · {formatarDataHora(m.criadoEm)}
                  </div>
                  <div className={estilos.numero}>
                    <strong>{valor < 0 ? `−${formatarReais(-valor)}` : `+${formatarReais(valor)}`}</strong>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
