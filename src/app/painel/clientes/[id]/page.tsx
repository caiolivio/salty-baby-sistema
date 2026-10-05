import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPagina } from "@/lib/acesso";
import { descricaoDoAlerta } from "@/lib/alertas/regras";
import { SITUACOES_SACOLINHA, textoDoPrazo } from "@/lib/sacolinhas/regras";
import { prisma } from "@/lib/banco";
import { formatarCpf } from "@/lib/clientes/dados";
import {
  agruparGasto,
  dentroDoPeriodo,
  estimarCriancas,
  formatarIdade,
  lerPeriodo,
  marcasPreferidas,
  mesesEntre,
  tamanhoDaCrianca,
} from "@/lib/clientes/perfil";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { formatarTelefone, lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import { podeAcessar, podeVer, temExtra } from "@/lib/permissoes";
import { CANAIS_DIRETOS, FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { AcessoAoSite } from "../acesso-ao-site";
import { salvarCliente } from "../acoes";
import visual from "../cliente.module.css";
import { FormularioCrianca } from "../criancas";
import { EscolherPeriodo } from "../escolher-periodo";
import { GraficoGasto } from "../grafico-gasto";
import { FormularioCliente } from "../formulario-cliente";
import { HistoricoDoRegistro } from "../../historico/do-registro";
import { Voltar } from "@/componentes/voltar";

export const metadata: Metadata = { title: "Cliente" };

const NOMES_PEDIDO = { reservado: "Reservado", expirado: "Reserva vencida", cancelado: "Cancelado", pago: "Pago" } as const;
const canal = (c: string) => (c === "site" ? "Site" : (CANAIS_DIRETOS.find((d) => d.valor === c)?.nome ?? c));

export default async function Cliente({ params, searchParams }: PageProps<"/painel/clientes/[id]">) {
  const { id } = await params;
  const usuario = await exigirPagina("clientes", "ver", `/painel/clientes/${id}`);
  const administradora = podeAcessar(usuario.perfis, "painel-administracao");
  // Quanto a cliente gastou: para quem também vê Vendas.
  const verGasto = podeVer(usuario.acesso, "vendas");
  const aviso = await searchParams;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      vendas: {
        orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
        include: {
          pedido: { select: { id: true } },
          itens: { include: { peca: { select: { id: true, codigo: true, nome: true, tamanho: true, marca: true } } } },
        },
      },
      pedidos: { where: { status: { not: "pago" } }, orderBy: { numero: "desc" }, take: 20 },
      sacolinhas: {
        where: { situacao: { in: ["aberta", "envio_pedido"] } },
        orderBy: { abertaEm: "asc" },
        select: { id: true, situacao: true, prazo: true, _count: { select: { itens: true } } },
      },
      criancas: { orderBy: [{ nascimento: "asc" }, { criadoEm: "asc" }] },
      usuario: { select: { email: true, ultimoAcessoEm: true, ativo: true } },
      favoritos: {
        orderBy: { criadoEm: "desc" },
        select: { peca: { select: { id: true, codigo: true, nome: true, status: true } } },
      },
    },
  });
  if (!cliente) notFound();
  const c = cliente;
  const alertas = await prisma.alerta.findMany({ where: { clienteId: c.id }, orderBy: { criadoEm: "asc" } });
  const categoriasDosAlertas = new Map(
    (
      await prisma.categoria.findMany({
        where: { id: { in: alertas.flatMap((a) => (a.categoriaId ? [a.categoriaId] : [])) } },
        select: { id: true, nome: true },
      })
    ).map((x) => [x.id, x.nome]),
  );
  const tel = lerTelefoneCliente(c.telefone);
  const gasto = c.vendas.reduce((s, v) => s + v.totalCentavos, 0);
  const tamanhos = [...new Set(c.vendas.flatMap((v) => v.itens.map((i) => i.peca.tamanho)).filter(Boolean))];
  const agora = new Date();
  const hoje = hojeEmSaoPaulo();
  const pecasCompradas = c.vendas.flatMap((v) => v.itens.map((i) => ({ data: v.data, tamanho: i.peca.tamanho, marca: i.peca.marca })));
  const periodo = lerPeriodo(aviso, hoje);
  const vendasDoPeriodo = c.vendas.filter((v) => dentroDoPeriodo(v.data, periodo));
  const gastoDoPeriodo = vendasDoPeriodo.reduce((s, v) => s + v.totalCentavos, 0);
  const ticketMedio = vendasDoPeriodo.length ? Math.round(gastoDoPeriodo / vendasDoPeriodo.length) : 0;
  const pecasDoPeriodo = vendasDoPeriodo.reduce((s, v) => s + v.itens.length, 0);
  const estimadas = estimarCriancas(pecasCompradas, agora);
  const marcas = marcasPreferidas(pecasCompradas.map((p) => p.marca));
  const mesAno = (d: Date) => formatarData(d).slice(3);

  return (
    <>
      <p>
        <Voltar href="/painel/clientes">Clientes</Voltar>
      </p>
      <h1 className={estilos.titulo}>{c.nome}</h1>
      {aviso.criada && (
        <p className={proprios.aviso} role="status">
          Cliente cadastrada.
        </p>
      )}
      {aviso.salva && (
        <p className={proprios.aviso} role="status">
          Alterações salvas.
        </p>
      )}
      <div className={proprios.resumo}>
        {tel && (
          <a href={linkWhatsappCliente(tel)} target="_blank" rel="noopener noreferrer">
            WhatsApp {formatarTelefone(tel)}
          </a>
        )}
        <span>{c.vendas.length} compra(s)</span>
        {verGasto && <span>{formatarReais(gasto)} no total</span>}
        {c.vendas[0] && <span>última em {formatarData(c.vendas[0].data)}</span>}
        {tamanhos.length > 0 && <span>tamanhos comprados: {tamanhos.join(", ")}</span>}
        {administradora && c.cpf && <span>CPF {formatarCpf(c.cpf)}</span>}
      </div>

      <h2>Dados da cliente</h2>
      <FormularioCliente
        acao={salvarCliente}
        textoBotao="Salvar alterações"
        voltar="/painel/clientes"
        mostrarCpf={administradora}
        iniciais={{
          id: c.id,
          nome: c.nome,
          telefone: tel ? formatarTelefone(tel) : (c.telefone ?? ""),
          email: c.email ?? "",
          cpf: administradora ? (c.cpf ?? "") : "",
          endereco: c.endereco ?? "",
          cep: c.cep ?? "",
          cidade: c.cidade ?? "",
          estado: c.estado ?? "",
          observacao: c.observacao ?? "",
        }}
      />

      <h2 id="acesso">Acesso ao site</h2>
      {c.usuario ? (
        <p>
          Tem conta com o e-mail <strong>{c.usuario.email}</strong>
          {c.usuario.ultimoAcessoEm ? `, último acesso em ${formatarDataHora(c.usuario.ultimoAcessoEm)}` : ", ainda não entrou"}.
          {!c.usuario.ativo && " A conta está desativada."}
        </p>
      ) : (
        <p>Esta cliente ainda não tem conta no site.</p>
      )}
      {administradora ? (
        <AcessoAoSite clienteId={c.id} email={c.usuario?.email ?? c.email ?? ""} temConta={Boolean(c.usuario)} />
      ) : (
        !c.usuario && <p className={proprios.dica}>Só a administradora cria o acesso.</p>
      )}
      {alertas.length > 0 && (
        <p>
          Pediu aviso de chegada: {alertas.map((a) => descricaoDoAlerta(a, categoriasDosAlertas.get(a.categoriaId ?? ""))).join("; ")}
        </p>
      )}
      {c.favoritos.length > 0 && (
        <p>
          Favoritos ({c.favoritos.length}):{" "}
          {c.favoritos.map((f, i) => (
            <span key={f.peca.id}>
              {i > 0 && ", "}
              <Link href={`/painel/pecas/${f.peca.id}`}>{f.peca.codigo}</Link>
              {f.peca.status !== "publicada" && " (saiu)"}
            </span>
          ))}
        </p>
      )}

      <h2 id="resumo">Resumo · {periodo.rotulo}</h2>
      <EscolherPeriodo periodo={periodo} hoje={hoje} />
      <div className={visual.resumoCliente}>
        <div className={estilos.cartao}>
          <strong>{vendasDoPeriodo.length}</strong>
          compra(s) · {pecasDoPeriodo} peça(s)
        </div>
        {verGasto && (
          <div className={estilos.cartao}>
            <strong>{formatarReais(gastoDoPeriodo)}</strong>
            gasto no período
          </div>
        )}
        {verGasto && (
          <div className={estilos.cartao}>
            <strong>{formatarReais(ticketMedio)}</strong>
            ticket médio
          </div>
        )}
        {c.vendas[0] && (
          <div className={estilos.cartao}>
            <strong>{formatarData(c.vendas[0].data)}</strong>
            última compra (há {formatarIdade(mesesEntre(c.vendas[0].data, agora)).replace("recém-nascido", "menos de 1 mês")})
          </div>
        )}
      </div>
      {verGasto && vendasDoPeriodo.length > 0 && (
        <GraficoGasto
          barras={agruparGasto(c.vendas, periodo)}
          titulo={`Gasto por ${periodo.por === "dia" ? "dia" : "mês"} · ${periodo.rotulo}`}
        />
      )}
      {vendasDoPeriodo.length === 0 && <p>Nenhuma compra neste período.</p>}

      <h2>Crianças</h2>
      {estimadas.length > 0 && (
        <>
          <p>Pelas peças compradas (estimativa pelo tamanho e pela data de cada compra):</p>
          <ul className={visual.lista}>
            {estimadas.map((e, i) => (
              <li key={i}>
                <strong>
                  Hoje com cerca de {formatarIdade(e.idadeHoje)}, veste {e.tamanhoHoje}
                </strong>
                <span className={estilos.antigo}>
                  Nascimento por volta de {mesAno(e.nascimento)} · na última compra ({formatarData(e.ultimaCompra)}) tinha cerca de{" "}
                  {formatarIdade(e.idadeNaUltimaCompra)} · {e.pecas} peça(s) com tamanho
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className={visual.criancas}>
        {c.criancas.map((k) => {
          const idade = k.nascimento ? mesesEntre(k.nascimento, agora) : undefined;
          const veste = tamanhoDaCrianca(k, agora);
          return (
            <FormularioCrianca
              key={k.id}
              clienteId={c.id}
              hoje={hoje}
              crianca={{
                id: k.id,
                nome: k.nome,
                nascimento: k.nascimento ? k.nascimento.toISOString().slice(0, 10) : "",
                sexo: k.sexo ?? "",
                tamanho: k.tamanho ?? "",
                resumo:
                  idade !== undefined
                    ? `${k.nome}: ${formatarIdade(idade)}, veste ${veste}.`
                    : veste
                      ? `${k.nome}: veste ${veste} (pelo tamanho informado).`
                      : `${k.nome}: sem data de nascimento.`,
              }}
            />
          );
        })}
        <FormularioCrianca clienteId={c.id} hoje={hoje} />
      </div>

      {marcas.length > 0 && (
        <>
          <h2>Marcas mais compradas</h2>
          <ol className={visual.lista}>
            {marcas.map((m) => (
              <li key={m.marca}>
                {m.marca} · {m.pecas} peça(s)
              </li>
            ))}
          </ol>
        </>
      )}

      {c.sacolinhas.length > 0 && podeVer(usuario.acesso, "sacolinhas") && (
        <>
          <h2>Sacolinha</h2>
          <ul>
            {c.sacolinhas.map((s) => (
              <li key={s.id}>
                <Link href={`/painel/sacolinhas/${s.id}`}>
                  {s._count.itens} peça(s) guardada(s)
                </Link>{" "}
                · {SITUACOES_SACOLINHA[s.situacao]} · {textoDoPrazo(s.prazo, hoje)}
              </li>
            ))}
          </ul>
        </>
      )}

      {c.pedidos.length > 0 && (
        <>
          <h2>Pedidos do site em aberto</h2>
          <ul>
            {c.pedidos.map((p) => (
              <li key={p.id}>
                <Link href={`/painel/pedidos/${p.id}`}>Pedido nº {p.numero}</Link> · {NOMES_PEDIDO[p.status]} · {formatarReais(p.totalCentavos)} ·{" "}
                {formatarDataHora(p.criadoEm)}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Compras</h2>
      {c.vendas.length === 0 ? (
        <p>Nenhuma compra registrada.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Canal</th>
                <th>Peças</th>
                {verGasto && <th className={estilos.numero}>Total</th>}
              </tr>
            </thead>
            <tbody>
              {c.vendas.map((v) => (
                <tr key={v.id}>
                  <td className={estilos.curta}>
                    {v.pedido ? <Link href={`/painel/pedidos/${v.pedido.id}`}>{formatarData(v.data)}</Link> : formatarData(v.data)}
                  </td>
                  <td data-rotulo="Canal">
                    {v.grupo ? `Grupo ${v.grupo}` : canal(v.canal)}
                    <span className={estilos.antigo}>{FORMAS_PAGAMENTO.find((f) => f.valor === v.formaPagamento)?.nome}</span>
                  </td>
                  <td data-rotulo="Peças">
                    {v.itens.map((i) => (
                      <span key={i.id} className={estilos.antigo}>
                        <Link href={`/painel/pecas/${i.peca.id}`}>{i.peca.codigo}</Link> {i.peca.nome}
                        {i.peca.tamanho && ` (${i.peca.tamanho})`}
                      </span>
                    ))}
                  </td>
                  {verGasto && (
                    <td className={estilos.numero} data-rotulo="Total">
                      {formatarReais(v.totalCentavos)}
                      {v.descontoCentavos > 0 && <span className={estilos.antigo}>desconto {formatarReais(v.descontoCentavos)}</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <HistoricoDoRegistro tabela="cliente" registroId={c.id} verRestritos={temExtra(usuario.acesso, "valores")} />
    </>
  );
}
