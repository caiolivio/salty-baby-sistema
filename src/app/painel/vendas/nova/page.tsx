import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { listarOpcoesDeClientes } from "@/lib/clientes/opcoes";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { tirarDaVenda } from "./acoes";
import { FormularioVenda } from "./formulario-venda";
import { IncluirNaVenda } from "./incluir-na-venda";
import { pecasDaVenda } from "./pecas-da-venda";

export const metadata: Metadata = { title: "Nova venda · Salty Baby" };

// Venda pelo WhatsApp, grupos, Instagram, loja ou Bag, registrada direto no painel.
export default async function NovaVenda() {
  await exigirAcesso("painel-administracao", "/painel/vendas/nova");
  await liberarReservasVencidas();
  const ids = await pecasDaVenda();
  const [encontradas, clientes] = await Promise.all([
    prisma.peca.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        codigo: true,
        nome: true,
        tamanho: true,
        marca: true,
        status: true,
        quantidade: true,
        precoCentavos: true,
        fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
        fornecedora: { select: { codigo: true, nome: true } },
      },
    }),
    listarOpcoesDeClientes(),
  ]);
  const pecas = ids.flatMap((id) => encontradas.filter((p) => p.id === id));
  const total = pecas.reduce((s, p) => s + p.precoCentavos, 0);

  return (
    <>
      <p>
        <Link href="/painel/vendas">← Vendas</Link>
      </p>
      <h1 className={estilos.titulo}>Nova venda</h1>
      <p>Para vendas pelo WhatsApp, pelos grupos, pelo Instagram, na loja ou na Bag. Os pedidos do site são confirmados em Pedidos.</p>

      <IncluirNaVenda />

      {pecas.length === 0 ? (
        <p>Nenhuma peça na venda ainda.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th aria-label="Foto" />
                <th>Código</th>
                <th>Peça</th>
                <th>Fornecedora</th>
                <th className={estilos.numero}>Preço</th>
                <th aria-label="Tirar" />
              </tr>
            </thead>
            <tbody>
              {pecas.map((p) => {
                const foto = p.fotos[0];
                const aVenda = p.status === "publicada" && p.quantidade > 0;
                return (
                  <tr key={p.id} className={estilos.comFoto}>
                    <td className={estilos.foto}>
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio
                        <img className={estilos.miniatura} src={enderecoDaFoto(foto.arquivo, true)} alt="" loading="lazy" />
                      ) : (
                        <span className={estilos.miniatura} />
                      )}
                    </td>
                    <td className={estilos.curta}>
                      <Link href={`/painel/pecas/${p.id}`} className={estilos.codigo}>
                        {p.codigo}
                      </Link>
                    </td>
                    <td>
                      {p.nome}
                      {(p.tamanho || p.marca) && (
                        <span className={estilos.antigo}>{[p.tamanho && `Tam. ${p.tamanho}`, p.marca].filter(Boolean).join(" · ")}</span>
                      )}
                      {!aVenda && <span className={proprios.erro}>Esta peça não está mais à venda. Tire-a da venda.</span>}
                    </td>
                    <td data-rotulo="Fornecedora">{p.fornecedora ? `${p.fornecedora.codigo} ${p.fornecedora.nome}` : "Peça da loja"}</td>
                    <td className={estilos.numero} data-rotulo="Preço">
                      {formatarReais(p.precoCentavos)}
                    </td>
                    <td>
                      <form action={tirarDaVenda}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className={proprios.botaoSecundario} aria-label={`Tirar ${p.codigo} da venda`}>
                          Tirar
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p>
        Total: <strong>{formatarReais(total)}</strong> ({pecas.length} {pecas.length === 1 ? "peça" : "peças"})
      </p>

      <FormularioVenda hoje={hojeEmSaoPaulo()} clientes={clientes.map(({ id, nome, detalhe }) => ({ id, nome, detalhe }))} vazia={pecas.length === 0} />
    </>
  );
}
