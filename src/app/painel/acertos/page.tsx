import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { repassesPendentes } from "@/lib/acertos/gravar";
import { nomeDoTipoPix } from "@/lib/fornecedoras/contrato";
import { corteDoAcerto, DIAS_CONSOLIDACAO, nomeDaFormaAcerto, resumirAPagar } from "@/lib/acertos/regras";
import { prisma } from "@/lib/banco";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { saldosParaCompras } from "@/lib/fornecedoras/saldo-para-compras";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { BotoesExportar } from "../exportar/botoes";

export const metadata: Metadata = { title: "Contas a pagar" };

// Acerto mensal: no dia 1, a loja paga às fornecedoras os repasses das vendas
// já consolidadas (10 dias depois da venda, contrato 9.2 e 10.3). Só a administradora (envolve Pix e valores).
export default async function ContasAPagar({ searchParams }: PageProps<"/painel/acertos">) {
  await exigirAcesso("painel-administracao", "/painel/acertos");
  const aviso = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const corte = corteDoAcerto(hoje);

  const [pendentes, acertos, saldos] = await Promise.all([
    repassesPendentes(),
    prisma.acerto.findMany({
      orderBy: [{ data: "desc" }, { numero: "desc" }],
      take: 100,
      include: { fornecedora: { select: { codigo: true, nome: true } } },
    }),
    saldosParaCompras(),
  ]);

  // Agrupa os repasses pendentes por fornecedora.
  type Fornecedora = NonNullable<(typeof pendentes)[number]["peca"]["fornecedora"]>;
  const porFornecedora = new Map<string, { fornecedora: Fornecedora; itens: { id: string; data: Date; repasseCentavos: number; quantidade: number }[] }>();
  for (const i of pendentes) {
    const f = i.peca.fornecedora;
    if (!f) continue;
    const grupo = porFornecedora.get(f.id) ?? { fornecedora: f, itens: [] };
    grupo.itens.push({ id: i.id, data: i.venda.data, repasseCentavos: i.repasseCentavos, quantidade: i.quantidade });
    porFornecedora.set(f.id, grupo);
  }
  const linhas = [...porFornecedora.values()]
    .map((g) => ({ ...g, resumo: resumirAPagar(g.itens, hoje) }))
    .sort((a, b) => b.resumo.fechadoCentavos - a.resumo.fechadoCentavos || a.fornecedora.codigo.localeCompare(b.fornecedora.codigo, "pt-BR", { numeric: true }));
  const total = resumirAPagar(
    linhas.flatMap((l) => l.itens),
    hoje,
  );

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Contas a pagar</h1>
        <BotoesExportar tabela="acertos" />
      </div>
      {aviso.desfeito && (
        <p className={proprios.aviso} role="status">
          Pagamento desfeito. As vendas voltaram a ficar a pagar.
        </p>
      )}
      <p>
        Repasses das peças vendidas que as fornecedoras ainda não receberam. Pelo contrato, a venda só entra no repasse{" "}
        {DIAS_CONSOLIDACAO} dias depois (prazo de troca): no primeiro dia útil do mês, pague o que foi vendido até{" "}
        {formatarData(new Date(`${corte}T00:00:00Z`))}. O que foi vendido depois entra no próximo acerto, mas também pode ser pago
        antes.
      </p>
      <div className={estilos.cartoes}>
        <div className={estilos.cartao}>
          <strong>{formatarReais(total.fechadoCentavos)}</strong>a pagar, vendas até{" "}
          {formatarData(new Date(`${corte}T00:00:00Z`))} ({total.pecasFechadas} {total.pecasFechadas === 1 ? "peça" : "peças"})
        </div>
        <div className={estilos.cartao}>
          <strong>{formatarReais(total.mesAtualCentavos)}</strong>
          vendido depois, para o próximo acerto
        </div>
      </div>

      <h2>A pagar</h2>
      {linhas.length === 0 ? (
        <p>Nenhum repasse a pagar. Todas as fornecedoras estão em dia.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Fornecedora</th>
                <th>Pix</th>
                <th className={estilos.numero}>Até {formatarData(new Date(`${corte}T00:00:00Z`))}</th>
                <th className={estilos.numero}>Próximo acerto</th>
                <th className={estilos.numero}>Total</th>
                <th>Pagar</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ fornecedora: f, resumo: r }) => (
                <tr key={f.id}>
                  <td>
                    <Link href={`/painel/fornecedoras/${f.id}`}>
                      {f.codigo} · {f.nome}
                    </Link>
                  </td>
                  <td data-rotulo="Pix">
                    {f.recebimentoPreferido === "credito" ? (
                      <>
                        Prefere crédito na loja
                        {f.pix && <span className={estilos.antigo}>Pix: {f.pix}</span>}
                      </>
                    ) : (
                      <>
                        {f.pix ?? "—"}
                        {f.pix && f.pixTipo && <span className={estilos.antigo}>{nomeDoTipoPix(f.pixTipo)}</span>}
                      </>
                    )}
                  </td>
                  <td className={estilos.numero} data-rotulo="Este acerto">
                    {formatarReais(r.fechadoCentavos)}
                    <span className={estilos.antigo}>
                      {r.pecasFechadas} {r.pecasFechadas === 1 ? "peça" : "peças"}
                    </span>
                  </td>
                  <td className={estilos.numero} data-rotulo="Próximo acerto">
                    {formatarReais(r.mesAtualCentavos)}
                    <span className={estilos.antigo}>
                      {r.pecasMesAtual} {r.pecasMesAtual === 1 ? "peça" : "peças"}
                    </span>
                  </td>
                  <td className={estilos.numero} data-rotulo="Total">
                    {formatarReais(r.totalCentavos)}
                    {(saldos.get(f.id)?.usadoPendenteCentavos ?? 0) > 0 && (
                      <span className={estilos.antigo}>
                        menos {formatarReais(saldos.get(f.id)?.usadoPendenteCentavos ?? 0)} já usados em compras
                      </span>
                    )}
                  </td>
                  <td>
                    <Link href={`/painel/acertos/pagar/${f.id}`} className={proprios.botao}>
                      Pagar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Pagamentos feitos</h2>
      {acertos.length === 0 ? (
        <p>Nenhum pagamento registrado no sistema ainda. Os acertos feitos no Notion aparecem como pagos em cada venda.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Fornecedora</th>
                <th>Forma</th>
                <th className={estilos.numero}>Peças</th>
                <th className={estilos.numero}>Total</th>
              </tr>
            </thead>
            <tbody>
              {acertos.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/painel/acertos/${a.id}`}>Nº {a.numero}</Link>
                    {a.canceladoEm && <span className={estilos.antigo}>desfeito</span>}
                  </td>
                  <td className={estilos.curta}>{formatarData(a.data)}</td>
                  <td>
                    {a.fornecedora.codigo} · {a.fornecedora.nome}
                  </td>
                  <td>{nomeDaFormaAcerto(a.forma)}</td>
                  <td className={estilos.numero}>{a.pecas}</td>
                  <td className={estilos.numero}>
                    {a.canceladoEm ? <s>{formatarReais(a.totalCentavos)}</s> : formatarReais(a.totalCentavos)}
                    {a.abatidoCentavos > 0 && <span className={estilos.antigo}>pago {formatarReais(a.totalCentavos - a.abatidoCentavos)}</span>}
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
