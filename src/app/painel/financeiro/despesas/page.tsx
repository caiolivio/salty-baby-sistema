import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { despesasDoMes } from "@/lib/financeiro/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerMes, nomeDoMesDoRelatorio } from "@/lib/relatorios/regras";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { BotoesExportar } from "../../exportar/botoes";
import { AbasDoFinanceiro } from "../abas";
import { apagarDespesa } from "../acoes";
import { EscolherMes } from "../escolher-mes";
import { FormularioDespesa } from "./formulario-despesa";

export const metadata: Metadata = { title: "Despesas" };

export default async function Despesas({ searchParams }: PageProps<"/painel/financeiro/despesas">) {
  await exigirAcesso("painel-administracao", "/painel/financeiro/despesas");
  const hoje = hojeEmSaoPaulo();
  const pedido = lerMes((await searchParams).mes);
  const mes = pedido && pedido <= hoje.slice(0, 7) ? pedido : hoje.slice(0, 7);
  const despesas = await despesasDoMes(mes);
  const total = despesas.reduce((s, d) => s + d.valorCentavos, 0);

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Financeiro</h1>
        <BotoesExportar tabela="despesas" />
      </div>
      <AbasDoFinanceiro mes={mes} />
      <h2>Lançar despesa</h2>
      <p>Aluguel, contas, embalagens, frete, anúncios, peças compradas para a loja… Tudo o que sai do caixa entra aqui.</p>
      <FormularioDespesa hoje={hoje} />

      <h2>
        Despesas de {nomeDoMesDoRelatorio(mes)}: {formatarReais(total)}
      </h2>
      <EscolherMes mes={mes} hoje={hoje} />
      {despesas.length === 0 ? (
        <p>Nenhuma despesa lançada neste mês.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Despesa</th>
                <th>Categoria</th>
                <th className={estilos.numero}>Valor</th>
                <th>Excluir</th>
              </tr>
            </thead>
            <tbody>
              {despesas.map((d) => (
                <tr key={d.id}>
                  <td className={estilos.curta}>{formatarData(d.data)}</td>
                  <td>
                    {d.descricao}
                    <span className={estilos.antigo}>lançada por {d.quem}</span>
                  </td>
                  <td data-rotulo="Categoria">{d.categoria}</td>
                  <td className={estilos.numero} data-rotulo="Valor">
                    {formatarReais(d.valorCentavos)}
                  </td>
                  <td>
                    <form action={apagarDespesa}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="mes" value={mes} />
                      <button type="submit" className={proprios.botaoSecundario} aria-label={`Excluir a despesa ${d.descricao}`}>
                        Excluir
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
