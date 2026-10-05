import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { formatarReais } from "@/lib/dinheiro";
import { resumoDoMes } from "@/lib/financeiro/regras";
import { dadosDoFinanceiro } from "@/lib/financeiro/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerMes, nomeDoMesDoRelatorio } from "@/lib/relatorios/regras";
import estilos from "../painel.module.css";
import { AbasDoFinanceiro } from "./abas";
import { EscolherMes } from "./escolher-mes";
import fin from "./financeiro.module.css";

export const metadata: Metadata = { title: "Financeiro" };

const reais = (centavos: number) => (centavos < 0 ? `−${formatarReais(-centavos)}` : formatarReais(centavos));
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mesCurto = (mes: string) => `${MESES_CURTOS[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;

// Financeiro: o lucro real de cada mês (vendas menos repasses, custo das peças
// da loja, taxas de pagamento e despesas). Só a administradora.
export default async function Financeiro({ searchParams }: PageProps<"/painel/financeiro">) {
  await exigirAcesso("painel-administracao", "/painel/financeiro");
  const hoje = hojeEmSaoPaulo();
  const pedido = lerMes((await searchParams).mes);
  const mes = pedido && pedido <= hoje.slice(0, 7) ? pedido : hoje.slice(0, 7);
  const { meses, vendas, despesas } = await dadosDoFinanceiro(mes);
  const r = resumoDoMes(vendas, despesas, mes);
  const historico = meses.map((m) => resumoDoMes(vendas, despesas, m)).reverse();
  const emAndamento = mes === hoje.slice(0, 7);

  return (
    <>
      <h1 className={estilos.titulo}>Financeiro</h1>
      <AbasDoFinanceiro mes={mes} />
      <EscolherMes mes={mes} hoje={hoje} />

      <h2>
        {nomeDoMesDoRelatorio(mes)}
        {emAndamento && " (até hoje)"}
      </h2>
      <div className={fin.destaque}>
        <span>Lucro real do mês</span>
        <strong className={r.lucroRealCentavos < 0 ? fin.negativo : undefined}>{reais(r.lucroRealCentavos)}</strong>
        <span>O que sobra das vendas depois de pagar as fornecedoras, o custo das peças da loja, as taxas e as despesas.</span>
      </div>

      <dl className={fin.conta}>
        <div>
          <dt>
            Vendas
            <small>
              {r.vendas} {r.vendas === 1 ? "venda" : "vendas"}, {r.pecas} {r.pecas === 1 ? "peça" : "peças"}
              {r.recebidoCentavos !== r.vendidoCentavos &&
                ` · ${formatarReais(r.vendidoCentavos - r.recebidoCentavos)} pagos com o saldo das fornecedoras`}
            </small>
          </dt>
          <dd>{formatarReais(r.vendidoCentavos)}</dd>
        </div>
        <div className={fin.menos}>
          <dt>Repasses às fornecedoras</dt>
          <dd>−{formatarReais(r.repassesCentavos)}</dd>
        </div>
        <div className={fin.menos}>
          <dt>Custo das peças da loja</dt>
          <dd>−{formatarReais(r.custoCentavos)}</dd>
        </div>
        <div className={fin.subtotal}>
          <dt>Lucro bruto</dt>
          <dd>{reais(r.lucroBrutoCentavos)}</dd>
        </div>
        <div className={fin.menos}>
          <dt>
            Taxas de pagamento
            <small>
              <Link href={`/painel/financeiro/taxas?mes=${mes}`}>Maquininha e Pix</Link>
            </small>
          </dt>
          <dd>−{formatarReais(r.taxasCentavos)}</dd>
        </div>
        <div className={fin.menos}>
          <dt>
            Despesas
            <small>
              <Link href={`/painel/financeiro/despesas?mes=${mes}`}>
                {r.despesasPorCategoria.length === 0 ? "Nenhuma lançada: lançar despesa" : "Ver e lançar despesas"}
              </Link>
            </small>
          </dt>
          <dd>−{formatarReais(r.despesasCentavos)}</dd>
        </div>
        <div className={fin.total}>
          <dt>Lucro real</dt>
          <dd className={r.lucroRealCentavos < 0 ? fin.negativo : undefined}>{reais(r.lucroRealCentavos)}</dd>
        </div>
      </dl>

      {r.despesasPorCategoria.length > 0 && (
        <>
          <h2>Despesas por categoria</h2>
          <dl className={fin.conta}>
            {r.despesasPorCategoria.map((c) => (
              <div key={c.categoria}>
                <dt>{c.categoria}</dt>
                <dd>{formatarReais(c.valorCentavos)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <h2>Últimos 12 meses</h2>
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Mês</th>
              <th className={estilos.numero}>Vendas</th>
              <th className={estilos.numero}>Lucro bruto</th>
              <th className={estilos.numero}>Taxas</th>
              <th className={estilos.numero}>Despesas</th>
              <th className={estilos.numero}>Lucro real</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((h) => (
              <tr key={h.mes}>
                <td>
                  <Link href={`/painel/financeiro?mes=${h.mes}`}>{mesCurto(h.mes)}</Link>
                </td>
                <td className={estilos.numero} data-rotulo="Vendas">
                  {formatarReais(h.vendidoCentavos)}
                </td>
                <td className={estilos.numero} data-rotulo="Lucro bruto">
                  {reais(h.lucroBrutoCentavos)}
                </td>
                <td className={estilos.numero} data-rotulo="Taxas">
                  {formatarReais(h.taxasCentavos)}
                </td>
                <td className={estilos.numero} data-rotulo="Despesas">
                  {formatarReais(h.despesasCentavos)}
                </td>
                <td className={`${estilos.numero} ${h.lucroRealCentavos < 0 ? fin.negativo : ""}`} data-rotulo="Lucro real">
                  <strong>{reais(h.lucroRealCentavos)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={estilos.antigo}>
        As vendas de antes do Financeiro não têm a taxa da maquininha. Para lançar a taxa num mês, abra Taxas de pagamento e toque em
        “Aplicar as taxas de hoje a este mês”.
      </p>
    </>
  );
}
