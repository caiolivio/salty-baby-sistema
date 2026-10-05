import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Voltar } from "@/componentes/voltar";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { enderecoDaFoto } from "@/lib/fotos";
import { lerLoja } from "@/lib/loja/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { formatarTelefone, lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import { podeAlterar } from "@/lib/permissoes";
import {
  avisoDeDoacao,
  enderecoDeEntrega,
  estaParaDoar,
  mensagemDoAviso,
  situacaoDoPrazo,
  SITUACOES_SACOLINHA,
  tamanhoMaisComum,
  textoDoPrazo,
} from "@/lib/sacolinhas/regras";
import { novidadesNoTamanho } from "@/lib/sacolinhas/servidor";
import { nomeDoStatus } from "@/lib/situacoes";
import type { Tamanho } from "@/lib/tamanhos";
import { linkDaVitrine } from "@/lib/vitrine";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { desfazerPedidoDeEnvio, doar, registrarPedidoDeEnvio } from "../acoes";
import { EnviarAviso } from "../enviar-aviso";
import proprio from "../sacolinhas.module.css";
import { FecharSacolinha, MudarPrazo } from "./formularios";

export const metadata: Metadata = { title: "Sacolinha" };

export default async function Sacolinha({ params }: PageProps<"/painel/sacolinhas/[id]">) {
  const { id } = await params;
  const usuario = await exigirPagina("sacolinhas", "ver", `/painel/sacolinhas/${id}`);
  const pode = podeAlterar(usuario.acesso, "sacolinhas");
  const sacolinha = await prisma.sacolinha.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true, telefone: true, endereco: true, cidade: true, estado: true, cep: true } },
      itens: {
        orderBy: { venda: { data: "asc" } },
        select: {
          id: true,
          valorPagoCentavos: true,
          venda: { select: { id: true, data: true } },
          peca: {
            select: {
              id: true,
              codigo: true,
              nome: true,
              tamanho: true,
              status: true,
              naoListada: true,
              fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
            },
          },
        },
      },
    },
  });
  if (!sacolinha) notFound();
  const loja = await lerLoja();
  const hoje = hojeEmSaoPaulo();
  const aberta = sacolinha.situacao === "aberta" || sacolinha.situacao === "envio_pedido";
  const guardadas = sacolinha.itens.filter((i) => i.peca.status === "na_sacolinha").map((i) => i.peca);
  const telefone = lerTelefoneCliente(sacolinha.cliente.telefone);
  const endereco = enderecoDeEntrega(sacolinha.cliente);
  const vencida = situacaoDoPrazo(sacolinha.prazo, hoje).tipo === "vencida";

  let aviso: string | null = null;
  if (sacolinha.situacao === "aberta" && guardadas.length > 0) {
    const origem = origemDaRequisicao(await headers()).replace(/\/+$/, "");
    const tamanho = tamanhoMaisComum(guardadas);
    aviso = mensagemDoAviso({
      nomeCliente: sacolinha.cliente.nome,
      nomeCurto: loja.nomeCurto,
      pecas: guardadas,
      prazo: sacolinha.prazo,
      hoje,
      novidades: tamanho
        ? {
            quantidade: await novidadesNoTamanho(tamanho),
            tamanho,
            link: `${origem}${linkDaVitrine({ pagina: 1 }, { tamanho: tamanho as Tamanho })}`,
          }
        : null,
      linkSacolinha: `${origem}/minha-conta/sacolinha`,
    });
  }

  return (
    <>
      <p>
        <Voltar href="/painel/sacolinhas">Sacolinhas</Voltar>
      </p>
      <h1 className={estilos.titulo}>
        Sacolinha de <Link href={`/painel/clientes/${sacolinha.cliente.id}`}>{sacolinha.cliente.nome}</Link>
      </h1>
      <dl className={proprio.resumo}>
        <div>
          <dt>Situação</dt>
          <dd>
            {SITUACOES_SACOLINHA[sacolinha.situacao]}
            {sacolinha.envioPedidoEm && sacolinha.situacao === "envio_pedido" && ` em ${formatarDataHora(sacolinha.envioPedidoEm)}`}
            {sacolinha.fechadaEm && ` em ${formatarData(sacolinha.fechadaEm)}`}
          </dd>
        </div>
        <div>
          <dt>Aberta em</dt>
          <dd>{formatarData(sacolinha.abertaEm)}</dd>
        </div>
        <div>
          <dt>Prazo</dt>
          <dd className={aberta && vencida ? proprio.vencida : undefined}>
            {aberta ? textoDoPrazo(sacolinha.prazo, hoje) : formatarData(sacolinha.prazo)}
          </dd>
        </div>
        {telefone && (
          <div>
            <dt>WhatsApp</dt>
            <dd>
              <a href={linkWhatsappCliente(telefone)} target="_blank" rel="noopener noreferrer">
                {formatarTelefone(telefone)}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt>Endereço de entrega</dt>
          <dd>{endereco ?? "Sem endereço na ficha"}</dd>
        </div>
        {sacolinha.freteCentavos !== null && (
          <div>
            <dt>Frete</dt>
            <dd>{formatarReais(sacolinha.freteCentavos)}</dd>
          </div>
        )}
        {sacolinha.observacao && (
          <div>
            <dt>Observação</dt>
            <dd>{sacolinha.observacao}</dd>
          </div>
        )}
      </dl>
      {sacolinha.situacao === "aberta" && <p className={proprios.aviso}>{avisoDeDoacao(sacolinha.prazo, loja.nomeCurto)}</p>}

      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Peça</th>
              <th>Paga em</th>
              <th>Valor pago</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sacolinha.itens.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.peca.fotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio
                    <img className={estilos.miniatura} src={enderecoDaFoto(i.peca.fotos[0].arquivo, true)} alt="" />
                  ) : (
                    <span className={estilos.miniatura} />
                  )}
                </td>
                <td>
                  <Link href={`/painel/pecas/${i.peca.id}`}>
                    {i.peca.codigo} · {i.peca.nome}
                  </Link>
                  {i.peca.tamanho && <> · Tam. {i.peca.tamanho}</>}
                </td>
                <td>{formatarData(i.venda.data)}</td>
                <td>{formatarReais(i.valorPagoCentavos)}</td>
                <td>
                  <span className={estilos.selo} data-status={i.peca.status}>
                    {nomeDoStatus(i.peca.status, i.peca.naoListada)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={estilos.contagem}>
        {sacolinha.itens.length} peça(s) · {formatarReais(sacolinha.itens.reduce((t, i) => t + i.valorPagoCentavos, 0))} já pagos
      </p>

      {pode && aberta && (
        <div className={proprio.blocos}>
          <section className={proprio.bloco} aria-label="Enviar">
            <h2>Enviar</h2>
            <p>
              {sacolinha.situacao === "envio_pedido"
                ? "A cliente pediu o envio. Depois de combinar e despachar, marque aqui."
                : "Quando a cliente pedir o envio e pagar o frete, marque aqui."}
            </p>
            <FecharSacolinha id={sacolinha.id} como="enviada" />
          </section>
          <section className={proprio.bloco} aria-label="Retirada">
            <h2>Retirada na loja</h2>
            <FecharSacolinha id={sacolinha.id} como="retirada" />
          </section>
          <section className={proprio.bloco} aria-label="Prazo">
            <h2>Prazo</h2>
            <p>Último dia para pedir o envio. Depois dele, as peças vão para a lista &quot;A doar&quot;.</p>
            <MudarPrazo id={sacolinha.id} prazo={sacolinha.prazo.toISOString().slice(0, 10)} hoje={hoje} />
          </section>
          <section className={proprio.bloco} aria-label="Pedido de envio">
            <h2>Pedido de envio</h2>
            {sacolinha.situacao === "aberta" ? (
              <>
                <p>
                  Se a cliente pediu o envio pelo WhatsApp, registre aqui. A sacolinha para de receber peças e a próxima
                  compra abre outra.
                </p>
                <form action={registrarPedidoDeEnvio}>
                  <input type="hidden" name="id" value={sacolinha.id} />
                  <button type="submit" className={proprios.botaoSecundario} disabled={guardadas.length === 0}>
                    Registrar pedido de envio
                  </button>
                </form>
              </>
            ) : (
              <>
                <p>Se a cliente desistiu do envio por enquanto, a sacolinha volta a receber as próximas compras.</p>
                <form action={desfazerPedidoDeEnvio}>
                  <input type="hidden" name="id" value={sacolinha.id} />
                  <button type="submit" className={proprios.botaoSecundario}>
                    Desfazer pedido de envio
                  </button>
                </form>
              </>
            )}
          </section>
          {estaParaDoar(sacolinha, hoje) && (
            <section className={proprio.bloco} aria-label="Doar">
              <h2>Doar</h2>
              <p>O prazo venceu. Ao confirmar, as peças ficam com o status &quot;Doada&quot;.</p>
              <form action={doar}>
                <input type="hidden" name="id" value={sacolinha.id} />
                <button type="submit" className={proprios.botaoPerigo}>
                  Doar as peças
                </button>
              </form>
            </section>
          )}
        </div>
      )}

      {aviso && (
        <section aria-label="Aviso semanal" className={proprio.aviso}>
          <h2>Aviso para a cliente</h2>
          <p className={estilos.contagem}>
            {sacolinha.ultimoAvisoEm ? `Último aviso em ${formatarDataHora(sacolinha.ultimoAvisoEm)}.` : "Ainda sem aviso."}
          </p>
          <pre className={estilos.textoPronto}>{aviso}</pre>
          {pode && <EnviarAviso sacolinhaId={sacolinha.id} texto={aviso} telefone={telefone} />}
        </section>
      )}
    </>
  );
}
