import type { Metadata } from "next";
import Link from "next/link";
import { calcularRepasse } from "@/lib/calculos";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { dadosDaFornecedora } from "@/lib/fornecedoras/area";
import estilos from "../../loja.module.css";
import { exigirFornecedoraLiberada } from "../liberada";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Minhas vendas", robots: { index: false } };

/** Quanto o desconto tirou do repasse dela, comparado com a venda pelo preço cheio. */
function textoDoDesconto(i: { precoUnitarioCentavos: number; descontoCentavos: number; percentualRepasse: number | null; repasseCentavos: number; quantidade: number }) {
  const cheio = calcularRepasse(i.precoUnitarioCentavos, i.percentualRepasse ?? 0) * i.quantidade;
  const menos = Math.max(0, cheio - i.repasseCentavos);
  const inicio = `Preço ${formatarReais(i.precoUnitarioCentavos)}, desconto de ${formatarReais(i.descontoCentavos)}`;
  return menos === 0
    ? `${inicio} por conta da loja (não mudou o seu repasse).`
    : `${inicio}: o seu repasse ficou ${formatarReais(menos)} menor.`;
}

export default async function MinhasVendas() {
  const { fornecedora } = await exigirFornecedoraLiberada("/fornecedora/vendas");
  const { itens } = await dadosDaFornecedora(fornecedora.id);
  const loja = await lerLoja();

  return (
    <>
      <h1 className={estilos.tituloPagina}>Vendas ({itens.length})</h1>
      <p className={estilos.dica}>
        O repasse é a sua parte de cada venda, calculada sobre o valor pago pela cliente (já com desconto), a não ser quando a{" "}
        {loja.nomeCurto} assume o desconto. A {loja.nomeCurto} paga os repasses no primeiro dia útil de cada mês; as vendas dos 10
        dias antes do pagamento (prazo de troca) ficam para o mês seguinte. À direita, quanto você recebe de cada venda.
      </p>
      {itens.length === 0 ? (
        <p>Nenhuma peça vendida ainda.</p>
      ) : (
        <ul className={estilos.listaVendasArea}>
          {itens.map((i) => (
            <li key={i.id}>
              <div>
                <strong>{i.peca.codigo}</strong> · {i.peca.nome}
                <br />
                Vendida em {formatarData(i.data)} por {formatarReais(i.valorPagoCentavos)}
                {i.descontoCentavos > 0 && (
                  <>
                    <br />
                    <span className={estilos.dica}>{textoDoDesconto(i)}</span>
                  </>
                )}
              </div>
              <div className={estilos.numero}>
                <strong>{formatarReais(i.repasseCentavos)}</strong>
                <br />
                <span className={estilos.seloProposta}>
                  {i.repasseRecebido
                    ? `Pago${i.repasseRecebidoEm ? ` em ${formatarData(i.repasseRecebidoEm)}` : ""}`
                    : "A receber"}
                </span>
                {i.acerto && !i.acerto.canceladoEm && (
                  <>
                    <br />
                    <Link href={`/fornecedora/pagamentos/${i.acerto.id}`}>Comprovante nº {i.acerto.numero}</Link>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
