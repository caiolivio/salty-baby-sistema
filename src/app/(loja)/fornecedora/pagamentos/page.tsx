import type { Metadata } from "next";
import Link from "next/link";
import { nomeDaFormaAcerto } from "@/lib/acertos/regras";
import { prisma } from "@/lib/banco";
import { formatarData } from "@/lib/datas";
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
      select: { id: true, numero: true, data: true, forma: true, totalCentavos: true, pecas: true },
    }),
    lerLoja(),
  ]);

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
                <strong>{formatarReais(a.totalCentavos)}</strong>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
