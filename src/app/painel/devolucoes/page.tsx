import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { enderecoDaFoto } from "@/lib/fotos";
import { formatarTelefone, lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import { nomeDoStatus } from "@/lib/situacoes";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { cancelar, marcarDevolvidas } from "./acoes";
import { BotoesExportar } from "../exportar/botoes";

export const metadata: Metadata = { title: "Devoluções · Salty Baby" };

export default async function Devolucoes({ searchParams }: PageProps<"/painel/devolucoes">) {
  await exigirAcesso("painel", "/painel/devolucoes");
  const { ver } = await searchParams;
  const historico = ver === "historico";

  const devolucoes = await prisma.devolucao.findMany({
    where: historico ? { situacao: { not: "pedida" } } : { situacao: "pedida" },
    orderBy: historico ? { concluidaEm: "desc" } : { pedidaEm: "asc" },
    take: historico ? 200 : undefined,
    include: {
      peca: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          dataEntrada: true,
          fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
        },
      },
      fornecedora: { select: { id: true, codigo: true, nome: true, telefone: true } },
    },
  });
  // Agrupa por fornecedora: a entrega costuma ser de várias peças de uma vez.
  const grupos = new Map<string, typeof devolucoes>();
  for (const d of devolucoes) grupos.set(d.fornecedora.id, [...(grupos.get(d.fornecedora.id) ?? []), d]);

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Devoluções</h1>
        <BotoesExportar tabela="devolucoes" />
      </div>
      <p>
        Peças que as fornecedoras pediram de volta pela área delas. Elas já saíram da vitrine. Quando entregar, marque como
        devolvida.
      </p>
      <p>
        {historico ? (
          <Link href="/painel/devolucoes">← Pedidos em aberto</Link>
        ) : (
          <Link href="/painel/devolucoes?ver=historico">Ver devoluções concluídas e canceladas</Link>
        )}
      </p>
      {devolucoes.length === 0 && <p>{historico ? "Nenhuma devolução concluída ainda." : "Nenhum pedido de devolução em aberto."}</p>}
      {[...grupos.values()].map((lista) => {
        const f = lista[0].fornecedora;
        const tel = lerTelefoneCliente(f.telefone);
        return (
          <section key={f.id} aria-label={`${f.codigo} · ${f.nome}`}>
            <h2>
              <Link href={`/painel/fornecedoras/${f.id}`}>
                {f.codigo} · {f.nome}
              </Link>
              {tel && (
                <>
                  {" · "}
                  <a href={linkWhatsappCliente(tel)} target="_blank" rel="noopener noreferrer">
                    {formatarTelefone(tel)}
                  </a>
                </>
              )}
            </h2>
            <div className={estilos.tabelaCaixa}>
              <table className={estilos.tabela}>
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Peça</th>
                    <th>Entrada</th>
                    <th>{historico ? "Situação" : "Pedida em"}</th>
                    {!historico && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((d) => (
                    <tr key={d.id}>
                      <td>
                        {d.peca.fotos[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio
                          <img className={estilos.miniatura} src={enderecoDaFoto(d.peca.fotos[0].arquivo, true)} alt="" />
                        ) : (
                          <span className={estilos.miniatura} />
                        )}
                      </td>
                      <td>
                        <Link href={`/painel/pecas/${d.peca.id}`}>
                          {d.peca.codigo} · {d.peca.nome}
                        </Link>
                      </td>
                      <td>{formatarData(d.peca.dataEntrada)}</td>
                      <td>
                        {historico
                          ? `${d.situacao === "devolvida" ? "Devolvida" : `Cancelada (voltou para ${nomeDoStatus(d.statusAnterior, d.naoListadaAnterior)})`}${d.concluidaEm ? ` em ${formatarDataHora(d.concluidaEm)}` : ""}`
                          : formatarDataHora(d.pedidaEm)}
                      </td>
                      {!historico && (
                        <td>
                          <div className={proprios.acoes}>
                            <form action={marcarDevolvidas}>
                              <input type="hidden" name="id" value={d.id} />
                              <button type="submit" className={proprios.botao}>
                                Devolvida
                              </button>
                            </form>
                            <form action={cancelar}>
                              <input type="hidden" name="id" value={d.id} />
                              <button type="submit" className={proprios.botaoSecundario}>
                                Cancelar pedido
                              </button>
                            </form>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!historico && lista.length > 1 && (
              <form action={marcarDevolvidas} className={proprios.acoes}>
                {lista.map((d) => (
                  <input key={d.id} type="hidden" name="id" value={d.id} />
                ))}
                <button type="submit" className={proprios.botao}>
                  Marcar as {lista.length} peças como devolvidas
                </button>
              </form>
            )}
          </section>
        );
      })}
    </>
  );
}
