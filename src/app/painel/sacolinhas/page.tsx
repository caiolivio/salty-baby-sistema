import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { exigirPagina } from "@/lib/acesso";
import { podeAlterar } from "@/lib/permissoes";
import { prisma } from "@/lib/banco";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { lerLoja } from "@/lib/loja/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { formatarTelefone, lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import {
  estaParaDoar,
  mensagemDoAviso,
  precisaDeAviso,
  situacaoDoPrazo,
  SITUACOES_SACOLINHA,
  tamanhoMaisComum,
  textoDoPrazo,
} from "@/lib/sacolinhas/regras";
import { novidadesNoTamanho } from "@/lib/sacolinhas/servidor";
import { linkDaVitrine } from "@/lib/vitrine";
import type { Tamanho } from "@/lib/tamanhos";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import abas from "../financeiro/financeiro.module.css";
import { doar } from "./acoes";
import proprio from "./sacolinhas.module.css";
import { EnviarAviso } from "./enviar-aviso";
import { BotoesExportar } from "../exportar/botoes";

export const metadata: Metadata = { title: "Sacolinhas" };

const VER = ["guardadas", "avisos", "doar", "fechadas"] as const;
type Ver = (typeof VER)[number];

const SELECAO = {
  id: true,
  situacao: true,
  abertaEm: true,
  prazo: true,
  envioPedidoEm: true,
  fechadaEm: true,
  freteCentavos: true,
  ultimoAvisoEm: true,
  cliente: { select: { id: true, nome: true, telefone: true } },
  itens: {
    select: {
      valorPagoCentavos: true,
      peca: { select: { id: true, codigo: true, nome: true, tamanho: true, status: true } },
    },
  },
} as const;

export default async function Sacolinhas({ searchParams }: PageProps<"/painel/sacolinhas">) {
  const usuario = await exigirPagina("sacolinhas", "ver", "/painel/sacolinhas");
  const pode = podeAlterar(usuario.acesso, "sacolinhas");
  const { ver: texto } = await searchParams;
  const ver: Ver = VER.find((v) => v === texto) ?? "guardadas";
  const hoje = hojeEmSaoPaulo();
  const agora = new Date();

  const [guardadas, fechadas, semCliente, loja] = await Promise.all([
    prisma.sacolinha.findMany({
      where: { situacao: { in: ["aberta", "envio_pedido"] } },
      orderBy: [{ prazo: "asc" }],
      select: SELECAO,
    }),
    ver === "fechadas"
      ? prisma.sacolinha.findMany({
          where: { situacao: { in: ["enviada", "retirada", "doada"] } },
          orderBy: { fechadaEm: "desc" },
          take: 200,
          select: SELECAO,
        })
      : [],
    prisma.peca.findMany({
      where: {
        status: "na_sacolinha",
        itensVendidos: { none: { sacolinha: { situacao: { in: ["aberta", "envio_pedido"] } } } },
      },
      select: { id: true, codigo: true, nome: true },
    }),
    lerLoja(),
  ]);
  // Envio pedido primeiro (é o que a loja precisa despachar), depois pelo prazo.
  guardadas.sort((a, b) => Number(b.situacao === "envio_pedido") - Number(a.situacao === "envio_pedido"));
  const comPecas = (s: (typeof guardadas)[number]) => s.itens.filter((i) => i.peca.status === "na_sacolinha");
  const avisos = guardadas.filter((s) => s.situacao === "aberta" && comPecas(s).length > 0 && precisaDeAviso(s, agora));
  const paraDoar = guardadas.filter((s) => estaParaDoar(s, hoje));

  const contagem: Record<Ver, number | null> = {
    guardadas: guardadas.length,
    avisos: avisos.length,
    doar: paraDoar.length,
    fechadas: null,
  };
  const nomes: Record<Ver, string> = { guardadas: "Guardadas", avisos: "Avisos da semana", doar: "A doar", fechadas: "Fechadas" };

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Sacolinhas</h1>
        <BotoesExportar tabela="sacolinhas" />
      </div>
      <p>
        Peças já pagas que ficam guardadas na loja até a cliente pedir o envio. O prazo é de {loja.mesesSacolinha} meses
        a partir da primeira peça (dá para mudar em cada sacolinha). Depois do prazo, as peças vão para a lista &quot;A
        doar&quot;, e a loja confirma a doação.
      </p>
      <nav className={abas.abas} aria-label="Sacolinhas">
        {VER.map((v) => (
          <Link key={v} href={`/painel/sacolinhas${v === "guardadas" ? "" : `?ver=${v}`}`} aria-current={v === ver ? "page" : undefined}>
            {nomes[v]}
            {contagem[v] !== null && ` (${contagem[v]})`}
          </Link>
        ))}
      </nav>

      {ver === "guardadas" && (
        <>
          {guardadas.length === 0 && <p>Nenhuma sacolinha guardada agora.</p>}
          <ListaDeSacolinhas sacolinhas={guardadas} hoje={hoje} />
          {semCliente.length > 0 && (
            <section aria-label="Peças sem sacolinha">
              <h2>Peças &quot;Na sacolinha&quot; sem cliente</h2>
              <p className={proprios.aviso}>
                Estas peças estão com o status &quot;Na sacolinha&quot;, mas a venda não tem cliente. Abra a peça e mude o
                status para &quot;Vendida&quot;, &quot;Enviada&quot; ou &quot;Retirada&quot;.
              </p>
              <ul>
                {semCliente.map((p) => (
                  <li key={p.id}>
                    <Link href={`/painel/pecas/${p.id}`}>
                      {p.codigo} · {p.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {ver === "avisos" && (
        <Avisos sacolinhas={avisos} hoje={hoje} pode={pode} nomeCurto={loja.nomeCurto} origem={origemDaRequisicao(await headers()).replace(/\/+$/, "")} />
      )}

      {ver === "doar" && (
        <>
          <p>
            Sacolinhas abertas com o prazo vencido. Antes de doar, se quiser, chame a cliente ou mude o prazo na
            sacolinha. Ao confirmar, as peças ficam com o status &quot;Doada&quot;.
          </p>
          {paraDoar.length === 0 && <p>Nenhuma sacolinha vencida.</p>}
          <ListaDeSacolinhas
            sacolinhas={paraDoar}
            hoje={hoje}
            acao={(s) =>
              pode ? (
                <form action={doar}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className={proprios.botaoPerigo}>
                    Doar as peças
                  </button>
                </form>
              ) : null
            }
          />
        </>
      )}

      {ver === "fechadas" && (
        <>
          {fechadas.length === 0 && <p>Nenhuma sacolinha fechada ainda.</p>}
          <ListaDeSacolinhas sacolinhas={fechadas} hoje={hoje} />
        </>
      )}
    </>
  );
}

type SacolinhaDaLista = {
  id: string;
  situacao: keyof typeof SITUACOES_SACOLINHA;
  abertaEm: Date;
  prazo: Date;
  envioPedidoEm: Date | null;
  fechadaEm: Date | null;
  freteCentavos: number | null;
  cliente: { id: string; nome: string; telefone: string | null };
  ultimoAvisoEm: Date | null;
  itens: { valorPagoCentavos: number; peca: { codigo: string; nome: string; tamanho: string | null; status: string } }[];
};

function ListaDeSacolinhas({
  sacolinhas,
  hoje,
  acao,
}: {
  sacolinhas: SacolinhaDaLista[];
  hoje: string;
  acao?: (s: SacolinhaDaLista) => React.ReactNode;
}) {
  if (sacolinhas.length === 0) return null;
  return (
    <div className={estilos.tabelaCaixa}>
      <table className={estilos.tabela}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Peças</th>
            <th>Aberta em</th>
            <th>Prazo</th>
            <th>Situação</th>
            {acao && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {sacolinhas.map((s) => {
            const fechada = s.fechadaEm !== null;
            const prazo = situacaoDoPrazo(s.prazo, hoje);
            const telefone = lerTelefoneCliente(s.cliente.telefone);
            return (
              <tr key={s.id}>
                <td>
                  <Link href={`/painel/sacolinhas/${s.id}`}>{s.cliente.nome}</Link>
                  {telefone && (
                    <>
                      <br />
                      <a href={linkWhatsappCliente(telefone)} target="_blank" rel="noopener noreferrer">
                        {formatarTelefone(telefone)}
                      </a>
                    </>
                  )}
                </td>
                <td>
                  {s.itens.length} · {formatarReais(s.itens.reduce((t, i) => t + i.valorPagoCentavos, 0))}
                </td>
                <td>{formatarData(s.abertaEm)}</td>
                <td>{fechada ? formatarData(s.prazo) : <span className={prazo.tipo === "vencida" ? proprio.vencida : undefined}>{textoDoPrazo(s.prazo, hoje)}</span>}</td>
                <td>
                  <span className={estilos.selo} data-status={s.situacao === "envio_pedido" ? "reservada" : undefined}>
                    {SITUACOES_SACOLINHA[s.situacao]}
                  </span>
                  {s.situacao === "envio_pedido" && s.envioPedidoEm && <> em {formatarDataHora(s.envioPedidoEm)}</>}
                  {fechada && s.fechadaEm && <> em {formatarData(s.fechadaEm)}</>}
                  {s.freteCentavos ? <> · frete {formatarReais(s.freteCentavos)}</> : null}
                </td>
                {acao && <td>{acao(s)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function Avisos({
  sacolinhas,
  hoje,
  pode,
  nomeCurto,
  origem,
}: {
  sacolinhas: SacolinhaDaLista[];
  hoje: string;
  pode: boolean;
  nomeCurto: string;
  origem: string;
}) {
  // Uma contagem de novidades por tamanho, para todas as clientes.
  const tamanhos = new Map<string, number>();
  for (const s of sacolinhas) {
    const t = tamanhoMaisComum(s.itens.map((i) => i.peca));
    if (t && !tamanhos.has(t)) tamanhos.set(t, await novidadesNoTamanho(t));
  }
  return (
    <>
      <p>
        Uma vez por semana, cada cliente com sacolinha recebe um aviso com as peças, o prazo, as novidades no tamanho
        dela e o atalho para pedir o envio. Toque em &quot;Enviar no WhatsApp&quot;: a mensagem já vai pronta e a
        sacolinha sai desta lista por uma semana.
      </p>
      {sacolinhas.length === 0 && <p>Nenhum aviso para mandar hoje.</p>}
      {sacolinhas.map((s) => {
        const pecas = s.itens.filter((i) => i.peca.status === "na_sacolinha").map((i) => i.peca);
        const tamanho = tamanhoMaisComum(pecas);
        const texto = mensagemDoAviso({
          nomeCliente: s.cliente.nome,
          nomeCurto,
          pecas,
          prazo: s.prazo,
          hoje,
          novidades: tamanho
            ? { quantidade: tamanhos.get(tamanho) ?? 0, tamanho, link: `${origem}${linkDaVitrine({ pagina: 1 }, { tamanho: tamanho as Tamanho })}` }
            : null,
          linkSacolinha: `${origem}/minha-conta/sacolinha`,
        });
        return (
          <article key={s.id} className={proprio.aviso}>
            <h2>
              <Link href={`/painel/sacolinhas/${s.id}`}>{s.cliente.nome}</Link>
            </h2>
            <p className={estilos.contagem}>
              {pecas.length} peça(s) · {textoDoPrazo(s.prazo, hoje)}
              {s.ultimoAvisoEm ? ` · último aviso em ${formatarData(s.ultimoAvisoEm)}` : " · ainda sem aviso"}
            </p>
            <pre className={estilos.textoPronto}>{texto}</pre>
            {pode && <EnviarAviso sacolinhaId={s.id} texto={texto} telefone={lerTelefoneCliente(s.cliente.telefone)} />}
          </article>
        );
      })}
    </>
  );
}
