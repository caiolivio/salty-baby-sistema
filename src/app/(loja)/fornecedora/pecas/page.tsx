import type { Metadata } from "next";
import { formatarData, formatarDia } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { dadosDaFornecedora } from "@/lib/fornecedoras/area";
import { situacaoDaDevolucao } from "@/lib/fornecedoras/saldos";
import { enderecoDaFoto } from "@/lib/fotos";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { nomeDoStatus } from "@/lib/situacoes";
import { TAMANHOS } from "@/lib/tamanhos";
import estilos from "../../loja.module.css";
import { pedirDevolucoes } from "../acoes";
import { exigirFornecedoraLiberada } from "../liberada";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Minhas peças", robots: { index: false } };

const brasileira = (t: string) => `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}`;

export default async function MinhasPecas({ searchParams }: PageProps<"/fornecedora/pecas">) {
  const { fornecedora } = await exigirFornecedoraLiberada("/fornecedora/pecas");
  const { pedidas } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const { pecas } = await dadosDaFornecedora(fornecedora.id);
  const loja = await lerLoja();
  const linhas = pecas.map((p) => ({ ...p, devolucao: situacaoDaDevolucao(p, hoje, loja.mesesDevolucao) }));
  const podeAlguma = linhas.some((l) => l.devolucao.tipo === "pode");

  return (
    <>
      <h1 className={estilos.tituloPagina}>Minhas peças ({pecas.length})</h1>
      {pedidas !== undefined && (
        <p className={Number(pedidas) > 0 ? estilos.sucesso : estilos.erro} role="status">
          {Number(pedidas) > 0
            ? `Pedido de devolução feito para ${pedidas} peça(s). Elas saíram da vitrine, e a ${loja.nomeCurto} vai combinar a entrega com você.`
            : "Nenhuma peça foi pedida. Marque as peças que podem ser devolvidas."}
        </p>
      )}
      <p className={estilos.dica}>
        Você pode pedir uma peça de volta a partir de {loja.mesesDevolucao} meses da data de entrada. Ao pedir, ela sai da
        vitrine na hora.
      </p>
      {pecas.length === 0 ? (
        <p>Você ainda não tem peças na {loja.nomeCurto}.</p>
      ) : (
        <form action={pedirDevolucoes} className={estilos.secaoArea}>
          <ul className={estilos.listaPecasArea}>
            {linhas.map((p) => (
              <li key={p.id}>
                <input
                  type="checkbox"
                  name="peca"
                  value={p.id}
                  disabled={p.devolucao.tipo !== "pode"}
                  aria-label={`Pedir de volta ${p.codigo}`}
                />
                {p.fotos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio
                  <img className={estilos.miniaturaArea} src={enderecoDaFoto(p.fotos[0].arquivo, true)} alt="" />
                ) : (
                  <span className={estilos.miniaturaArea} />
                )}
                <div>
                  <strong>{p.codigo}</strong> · {p.nome}
                  {p.tamanho && ` · ${TAMANHOS.find((t) => t.valor === p.tamanho)?.nome ?? p.tamanho}`}
                  <br />
                  <span className={estilos.seloProposta}>
                    {p.status === "rascunho" ? `Em cadastro na ${loja.nomeCurto}` : nomeDoStatus(p.status)}
                  </span>{" "}
                  Entrada em {formatarData(p.dataEntrada)}
                  {p.precoCentavos > 0 && ` · ${formatarReais(p.precoCentavos)}`}
                  {p.devolucao.tipo === "a-partir-de" && (
                    <span className={estilos.indisponivel}>
                      <br />
                      Devolução disponível a partir de {brasileira(p.devolucao.data)}
                    </span>
                  )}
                  {p.devolucao.tipo === "pedida" && p.devolucoes[0] && (
                    <span className={estilos.indisponivel}>
                      <br />
                      Devolução pedida em {formatarDia(p.devolucoes[0].pedidaEm)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {podeAlguma && (
            <button type="submit" className={estilos.botaoContorno}>
              Pedir de volta as peças marcadas
            </button>
          )}
        </form>
      )}
    </>
  );
}
