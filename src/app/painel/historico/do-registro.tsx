import { formatarDataHora } from "@/lib/datas";
import { historicoDoRegistro } from "@/lib/historico/consultar";
import { descreverMudanca, type TabelaDoHistorico } from "@/lib/historico/regras";
import estilos from "../painel.module.css";

/** Histórico de alterações no fim da página da peça, da fornecedora ou da cliente. */
export async function HistoricoDoRegistro({
  tabela,
  registroId,
  administradora,
}: {
  tabela: TabelaDoHistorico;
  registroId: string;
  administradora: boolean;
}) {
  const linhas = await historicoDoRegistro(tabela, registroId, administradora);
  return (
    <section aria-labelledby="titulo-historico">
      <h2 id="titulo-historico">Histórico de alterações</h2>
      {linhas.length === 0 ? (
        <p>Nenhuma alteração registrada ainda. O histórico começou a ser guardado em outubro de 2026.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Quando</th>
                <th>O que mudou</th>
                <th>Mudança</th>
                <th>Quem</th>
                <th>Por quê</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((a) => (
                <tr key={a.id}>
                  <td className={estilos.curta}>{formatarDataHora(a.criadoEm)}</td>
                  <td data-rotulo="O que mudou">
                    <strong>{a.campo}</strong>
                  </td>
                  <td data-rotulo="Mudança">{descreverMudanca(a)}</td>
                  <td data-rotulo="Quem">{a.quem}</td>
                  <td data-rotulo="Por quê">{a.motivo ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
