import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { BotoesExportar } from "../exportar/botoes";

export const metadata: Metadata = { title: "Vendas" };

const POR_PAGINA = 50;
const CANAIS: Record<string, string> = {
  site: "Site",
  whatsapp_privado: "WhatsApp",
  grupo_whatsapp: "Grupo de WhatsApp",
  instagram: "Instagram",
  loja: "Loja",
  bag: "Bag",
};

// Valores de repasse e lucro: só a administradora vê.
export default async function Vendas({ searchParams }: PageProps<"/painel/vendas">) {
  await exigirAcesso("painel-administracao", "/painel/vendas");
  const aviso = await searchParams;
  const pagina = Math.max(1, Number(aviso.pagina) || 1);
  const [total, vendas, somas] = await Promise.all([
    prisma.venda.count(),
    prisma.venda.findMany({
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        cliente: { select: { id: true, nome: true } },
        pedido: { select: { id: true } },
        itens: { include: { peca: { select: { id: true, codigo: true, nome: true } } } },
      },
    }),
    prisma.itemVenda.aggregate({ _sum: { valorPagoCentavos: true, repasseCentavos: true, lucroCentavos: true } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const soma = (lista: { repasseCentavos: number; lucroCentavos: number }[], campo: "repasseCentavos" | "lucroCentavos") =>
    lista.reduce((s, i) => s + i[campo], 0);

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Vendas</h1>
        <span className={proprios.exportar}>
          <BotoesExportar tabela="vendas" />
          <Link href="/painel/vendas/nova" className={proprios.botao}>
            + Nova venda
          </Link>
        </span>
      </div>
      {aviso.registrada && (
        <p className={proprios.aviso} role="status">
          Venda registrada. As peças saíram da vitrine.
        </p>
      )}
      <div className={estilos.cartoes}>
        <div className={estilos.cartao}>
          <strong>{formatarReais(somas._sum.valorPagoCentavos ?? 0)}</strong>
          vendido ({total} vendas)
        </div>
        <div className={estilos.cartao}>
          <strong>{formatarReais(somas._sum.repasseCentavos ?? 0)}</strong>
          de repasse às fornecedoras
        </div>
        <div className={estilos.cartao}>
          <strong>{formatarReais(somas._sum.lucroCentavos ?? 0)}</strong>
          de lucro da loja
        </div>
      </div>
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Venda</th>
              <th>Peças</th>
              <th className={estilos.numero}>Total</th>
              <th className={estilos.numero}>Repasse</th>
              <th className={estilos.numero}>Lucro</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id}>
                <td className={estilos.curta}>{formatarData(v.data)}</td>
                <td>
                  {v.pedido ? (
                    <Link href={`/painel/pedidos/${v.pedido.id}`}>{v.origem}</Link>
                  ) : v.cliente ? (
                    <Link href={`/painel/clientes/${v.cliente.id}`}>{v.origem ?? v.cliente.nome}</Link>
                  ) : (
                    (v.origem ?? "—")
                  )}
                  <span className={estilos.antigo}>
                    {[v.grupo ? (v.canal === "site" ? `Site, pelo grupo ${v.grupo}` : `Grupo ${v.grupo}`) : CANAIS[v.canal], FORMAS_PAGAMENTO.find((f) => f.valor === v.formaPagamento)?.nome].filter(Boolean).join(" · ")}
                  </span>
                </td>
                <td data-rotulo="Peças">
                  {v.itens.map((i) => (
                    <span key={i.id} className={estilos.antigo}>
                      <Link href={`/painel/pecas/${i.peca.id}`}>{i.peca.codigo}</Link> {i.peca.nome}
                    </span>
                  ))}
                </td>
                <td className={estilos.numero} data-rotulo="Total">
                  {formatarReais(v.totalCentavos)}
                  {v.descontoCentavos > 0 && <span className={estilos.antigo}>desc. {formatarReais(v.descontoCentavos)}</span>}
                </td>
                <td className={estilos.numero} data-rotulo="Repasse">
                  {formatarReais(soma(v.itens, "repasseCentavos"))}
                </td>
                <td className={estilos.numero} data-rotulo="Lucro">
                  {formatarReais(soma(v.itens, "lucroCentavos"))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <nav className={estilos.paginas} aria-label="Páginas">
          {pagina > 1 && <Link href={`/painel/vendas?pagina=${pagina - 1}`}>← Mais recentes</Link>}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && <Link href={`/painel/vendas?pagina=${pagina + 1}`}>Mais antigas →</Link>}
        </nav>
      )}
    </>
  );
}
