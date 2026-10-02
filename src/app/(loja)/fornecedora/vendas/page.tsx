import type { Metadata } from "next";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { dadosDaFornecedora } from "@/lib/fornecedoras/area";
import estilos from "../../loja.module.css";
import { exigirFornecedoraLiberada } from "../liberada";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Minhas vendas", robots: { index: false } };

export default async function MinhasVendas() {
  const { fornecedora } = await exigirFornecedoraLiberada("/fornecedora/vendas");
  const { itens } = await dadosDaFornecedora(fornecedora.id);
  const loja = await lerLoja();

  return (
    <>
      <h1 className={estilos.tituloPagina}>Vendas ({itens.length})</h1>
      <p className={estilos.dica}>
        O repasse é a sua parte de cada venda, calculada sobre o valor pago pela cliente (já com desconto). A {loja.nomeCurto} paga os
        repasses do mês no dia 1 do mês seguinte. À direita, quanto você recebe de cada venda.
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
              </div>
              <div className={estilos.numero}>
                <strong>{formatarReais(i.repasseCentavos)}</strong>
                <br />
                <span className={estilos.seloProposta}>
                  {i.repasseRecebido
                    ? `Pago${i.repasseRecebidoEm ? ` em ${formatarData(i.repasseRecebidoEm)}` : ""}`
                    : "A receber"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
