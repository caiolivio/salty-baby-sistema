import type { Metadata } from "next";
import Link from "next/link";
import { exigirPagina } from "@/lib/acesso";
import { temExtra } from "@/lib/permissoes";
import { prisma } from "@/lib/banco";
import { listarOpcoesDeClientes } from "@/lib/clientes/opcoes";
import { listarGruposEmUso } from "@/lib/grupos/opcoes";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { valoresDaPromocao } from "@/lib/promocoes/regras";
import { promocoesDasPecas } from "@/lib/promocoes/servidor";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { tirarDaVenda } from "./acoes";
import { opcoesDeSaldo } from "@/lib/fornecedoras/saldo-para-compras";
import { FormularioVenda } from "./formulario-venda";
import { IncluirNaVenda } from "./incluir-na-venda";
import { pecasDaVenda } from "./pecas-da-venda";
import { Voltar } from "@/componentes/voltar";

export const metadata: Metadata = { title: "Nova venda" };

// Venda pelo WhatsApp, grupos, Instagram, loja ou Bag, registrada direto no painel.
export default async function NovaVenda() {
  const { acesso } = await exigirPagina("vendas", "alterar", "/painel/vendas/nova");
  const valores = temExtra(acesso, "valores");
  await liberarReservasVencidas();
  const ids = await pecasDaVenda();
  const [encontradas, clientes, grupos, saldos] = await Promise.all([
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
        tipo: true,
        percentualRepasse: true,
        custoCentavos: true,
        fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
        fornecedora: { select: { codigo: true, nome: true, percentualRepassePadrao: true } },
      },
    }),
    listarOpcoesDeClientes(),
    listarGruposEmUso(),
    // O saldo das fornecedoras é repasse: só para quem vê os valores.
    valores ? opcoesDeSaldo() : [],
  ]);
  const pecas = ids.flatMap((id) => encontradas.filter((p) => p.id === id));
  const promocoes = await promocoesDasPecas(pecas);
  const total = pecas.reduce((s, p) => s + p.precoCentavos - (promocoes.get(p.id)?.descontoCentavos ?? 0), 0);

  return (
    <>
      <p>
        <Voltar href="/painel/vendas">Vendas</Voltar>
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
                      {formatarReais(p.precoCentavos - (promocoes.get(p.id)?.descontoCentavos ?? 0))}
                      {promocoes.has(p.id) && (
                        <span className={estilos.antigo}>
                          {promocoes.get(p.id)!.nome} · antes {formatarReais(p.precoCentavos)}
                        </span>
                      )}
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

      <FormularioVenda
        // Peças novas na venda: o formulário recomeça com o desconto das promoções delas.
        key={ids.join(",")}
        iniciais={valoresDaPromocao(
          pecas.flatMap((p) => {
            const promocao = promocoes.get(p.id);
            return promocao
              ? [
                  {
                    pecaId: p.id,
                    descontoCentavos: promocao.descontoCentavos,
                    porContaDaLoja: promocao.porContaDaLoja,
                    nome: promocao.nome,
                  },
                ]
              : [];
          }),
        )}
        hoje={hojeEmSaoPaulo()}
        clientes={clientes.map(({ id, nome, detalhe }) => ({ id, nome, detalhe }))}
        grupos={grupos.map(({ id, nome }) => ({ id, nome }))}
        mostrarValores={valores}
        saldos={saldos}
        pecas={pecas.map((p) => ({
          id: p.id,
          codigo: p.codigo,
          nome: p.nome,
          precoCentavos: p.precoCentavos,
          loja: p.tipo === "loja",
          // Custo e repasse só vão ao navegador de quem pode ver.
          percentualRepasse: valores ? (p.percentualRepasse ?? p.fornecedora?.percentualRepassePadrao ?? null) : null,
          custoCentavos: valores ? p.custoCentavos : null,
        }))}
      />
    </>
  );
}
