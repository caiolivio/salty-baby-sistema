import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerMes, mesAnterior, mesFechado, nomeDoMesDoRelatorio } from "@/lib/relatorios/regras";
import { relatoriosDoMes } from "@/lib/relatorios/servidor";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";

export const metadata: Metadata = { title: "Relatórios das fornecedoras" };

// Relatório mensal das fornecedoras: no dia 1, o do mês que passou fica pronto
// para cada fornecedora que vendeu. Só a administradora (mostra o repasse).
export default async function RelatoriosDoMes({ searchParams }: PageProps<"/painel/relatorios">) {
  await exigirAcesso("painel-administracao", "/painel/relatorios");
  const hoje = hojeEmSaoPaulo();
  const ultimo = mesAnterior(hoje);
  const pedido = lerMes((await searchParams).mes);
  const mes = pedido && mesFechado(pedido, hoje) ? pedido : ultimo;
  const linhas = await relatoriosDoMes(mes);
  const enviados = linhas.filter((l) => l.enviado).length;
  const repasse = linhas.reduce((s, l) => s + l.repasseCentavos, 0);

  return (
    <>
      <h1 className={estilos.titulo}>Relatórios das fornecedoras</h1>
      <p>
        No dia 1 de cada mês fica pronto o relatório do mês que passou para cada fornecedora que vendeu: só as vendas, com gráfico. Abra o
        relatório e toque em “Enviar no WhatsApp”. Ele também fica na área da fornecedora, na aba Relatórios.
      </p>
      <form method="get" className={estilos.busca} role="search">
        <label className={proprios.campo}>
          Mês
          <input type="month" name="mes" defaultValue={mes} max={ultimo} required />
        </label>
        <button type="submit" className={proprios.botaoSecundario}>
          Ver
        </button>
      </form>

      <h2>Relatórios de {nomeDoMesDoRelatorio(mes)}</h2>
      {linhas.length === 0 ? (
        <p>Nenhuma peça consignada foi vendida neste mês.</p>
      ) : (
        <>
          <div className={estilos.cartoes}>
            <div className={estilos.cartao}>
              <strong>
                {enviados} de {linhas.length}
              </strong>
              relatórios enviados
            </div>
            <div className={estilos.cartao}>
              <strong>{formatarReais(repasse)}</strong>
              de repasse no mês
            </div>
          </div>
          <div className={estilos.tabelaCaixa}>
            <table className={estilos.tabela}>
              <thead>
                <tr>
                  <th>Fornecedora</th>
                  <th className={estilos.numero}>Peças</th>
                  <th className={estilos.numero}>Vendido</th>
                  <th className={estilos.numero}>Repasse</th>
                  <th>Situação</th>
                  <th>Relatório</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.fornecedora.id}>
                    <td>
                      <Link href={`/painel/fornecedoras/${l.fornecedora.id}`}>
                        {l.fornecedora.codigo} · {l.fornecedora.nome}
                      </Link>
                    </td>
                    <td className={estilos.numero} data-rotulo="Peças">
                      {l.pecas}
                    </td>
                    <td className={estilos.numero} data-rotulo="Vendido">
                      {formatarReais(l.vendidoCentavos)}
                    </td>
                    <td className={estilos.numero} data-rotulo="Repasse">
                      {formatarReais(l.repasseCentavos)}
                    </td>
                    <td data-rotulo="Situação">
                      {l.enviado ? (
                        <>
                          <span className={estilos.selo} data-status="pedido_pago">
                            Enviado
                          </span>
                          <span className={estilos.antigo}>
                            {formatarDataHora(l.enviado.enviadoEm)} por {l.enviado.quem}
                          </span>
                        </>
                      ) : (
                        <span className={estilos.selo} data-status="pedido_reservado">
                          A enviar
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/painel/relatorios/${l.fornecedora.id}/${mes}`}
                        className={l.enviado ? proprios.botaoSecundario : proprios.botao}
                      >
                        {l.enviado ? "Ver" : "Ver e enviar"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
