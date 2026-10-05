import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { FORMAS_COM_TAXA, percentualNoCampo } from "@/lib/financeiro/regras";
import { taxasAtuais, vendasComTaxa } from "@/lib/financeiro/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerMes, nomeDoMesDoRelatorio } from "@/lib/relatorios/regras";
import { FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { AbasDoFinanceiro } from "../abas";
import { aplicarTaxas, corrigirTaxa, guardarTaxas } from "../acoes";
import { EscolherMes } from "../escolher-mes";
import fin from "../financeiro.module.css";

export const metadata: Metadata = { title: "Taxas de pagamento" };

const reaisNoCampo = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

export default async function Taxas({ searchParams }: PageProps<"/painel/financeiro/taxas">) {
  await exigirAcesso("painel-administracao", "/painel/financeiro/taxas");
  const aviso = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const pedido = lerMes(aviso.mes);
  const mes = pedido && pedido <= hoje.slice(0, 7) ? pedido : hoje.slice(0, 7);
  const [taxas, vendas] = await Promise.all([taxasAtuais(), vendasComTaxa(mes)]);
  const total = vendas.reduce((s, v) => s + v.taxaCentavos, 0);
  const erro = typeof aviso.erro === "string" ? aviso.erro : null;

  return (
    <>
      <h1 className={estilos.titulo}>Financeiro</h1>
      <AbasDoFinanceiro mes={mes} />
      {erro && (
        <p className={proprios.erro} role="alert">
          {erro}
        </p>
      )}
      {aviso.salvo && (
        <p className={proprios.aviso} role="status">
          Taxas salvas. Elas valem para as próximas vendas.
        </p>
      )}
      {typeof aviso.aplicadas === "string" && (
        <p className={proprios.aviso} role="status">
          {aviso.aplicadas === "0" ? "Nenhuma venda precisou mudar." : `Taxa atualizada em ${aviso.aplicadas} venda(s).`}
        </p>
      )}
      {aviso.ajustada && (
        <p className={proprios.aviso} role="status">
          Taxa da venda corrigida.
        </p>
      )}

      <h2>Taxas de hoje</h2>
      <p>
        O percentual que a maquininha e o banco cobram. Cada venda nova no cartão ou no Pix guarda a taxa calculada com ele. Se uma venda
        teve taxa diferente (crédito parcelado, por exemplo), corrija o valor na lista abaixo.
      </p>
      <form action={guardarTaxas} className={fin.formDespesa}>
        {FORMAS_COM_TAXA.map((f) => (
          <label key={f.valor} className={proprios.campo}>
            {f.nome} (%)
            <input name={f.valor} defaultValue={percentualNoCampo(taxas[f.valor] ?? 0)} inputMode="decimal" />
          </label>
        ))}
        <button type="submit" className={proprios.botao}>
          Salvar taxas
        </button>
      </form>

      <h2>
        Vendas no cartão e no Pix · {nomeDoMesDoRelatorio(mes)}: {formatarReais(total)} de taxas
      </h2>
      <EscolherMes mes={mes} hoje={hoje} />
      <form action={aplicarTaxas} className={fin.mes}>
        <input type="hidden" name="mes" value={mes} />
        <button type="submit" className={proprios.botaoSecundario}>
          Aplicar as taxas de hoje a este mês
        </button>
        <span className={estilos.antigo}>Recalcula as vendas do mês, menos as que você corrigiu à mão.</span>
      </form>
      {vendas.length === 0 ? (
        <p>Nenhuma venda no cartão ou no Pix neste mês.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Venda</th>
                <th>Forma</th>
                <th className={estilos.numero}>Valor</th>
                <th>Taxa (R$)</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id}>
                  <td className={estilos.curta}>{formatarData(v.data)}</td>
                  <td>
                    {v.cliente?.nome ?? v.origem ?? "Venda"}
                    <span className={estilos.antigo}>
                      {v._count.itens} {v._count.itens === 1 ? "peça" : "peças"}
                    </span>
                  </td>
                  <td data-rotulo="Forma">{FORMAS_PAGAMENTO.find((f) => f.valor === v.formaPagamento)?.nome}</td>
                  <td className={estilos.numero} data-rotulo="Valor">
                    {formatarReais(v.totalCentavos - v.creditoCentavos)}
                  </td>
                  <td data-rotulo="Taxa">
                    <form action={corrigirTaxa} className={fin.taxaLinha}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="mes" value={mes} />
                      <input name="taxa" defaultValue={reaisNoCampo(v.taxaCentavos)} inputMode="decimal" aria-label="Taxa em reais" />
                      <button type="submit" className={proprios.botaoSecundario}>
                        Salvar
                      </button>
                    </form>
                    {v.taxaAjustada && <span className={estilos.antigo}>corrigida à mão</span>}
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
