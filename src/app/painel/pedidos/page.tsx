import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarDataHora, formatarHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { minutosRestantes } from "@/lib/pedidos/regras";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { cancelarPedido } from "./acoes";

export const metadata: Metadata = { title: "Pedidos · Salty Baby" };

const NOMES = { reservado: "Reservado", expirado: "Reserva vencida", cancelado: "Cancelado", pago: "Pago" } as const;

export default async function Pedidos() {
  await exigirAcesso("painel", "/painel/pedidos");
  await liberarReservasVencidas();
  const pedidos = await prisma.pedido.findMany({
    orderBy: { numero: "desc" },
    take: 100,
    include: { itens: { orderBy: { ordem: "asc" }, include: { peca: { select: { id: true, codigo: true, nome: true, tamanho: true } } } } },
  });
  const agora = new Date();

  return (
    <>
      <h1 className={estilos.titulo}>Pedidos do site</h1>
      <p>
        Quando a cliente fecha o pedido no site, as peças ficam reservadas por 15 minutos e ela manda a mensagem no WhatsApp. Se
        a reserva vencer, as peças voltam sozinhas para a vitrine.
      </p>
      {pedidos.length === 0 ? (
        <p>Nenhum pedido ainda.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Peças</th>
                <th className={estilos.numero}>Total</th>
                <th>Situação</th>
                <th>Feito em</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td className={estilos.curta}>
                    <strong>{p.numero}</strong>
                  </td>
                  <td>{p.nomeCliente}</td>
                  <td data-rotulo="Peças">
                    {p.itens.map((i) => (
                      <span key={i.pecaId} className={estilos.antigo}>
                        <Link href={`/painel/pecas/${i.peca.id}`}>{i.peca.codigo}</Link> {i.peca.nome}
                        {i.peca.tamanho && ` (${i.peca.tamanho})`} · {formatarReais(i.precoCentavos)}
                      </span>
                    ))}
                  </td>
                  <td className={estilos.numero} data-rotulo="Total">
                    {formatarReais(p.totalCentavos)}
                  </td>
                  <td data-rotulo="Situação">
                    {NOMES[p.status]}
                    {p.status === "reservado" && (
                      <>
                        <span className={estilos.antigo}>
                          até {formatarHora(p.reservadoAte)} (faltam {minutosRestantes(p.reservadoAte, agora)} min)
                        </span>
                        <form action={cancelarPedido}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className={proprios.botaoSecundario}>
                            Cancelar e liberar peças
                          </button>
                        </form>
                      </>
                    )}
                  </td>
                  <td className={estilos.curta} data-rotulo="Feito em">
                    {formatarDataHora(p.criadoEm)}
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
