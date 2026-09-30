import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarCpf } from "@/lib/clientes/dados";
import { estimarCriancas, formatarIdade, gastoPorMes, marcasPreferidas, mesesEntre, tamanhoParaIdade } from "@/lib/clientes/perfil";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { formatarTelefone, lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import { podeAcessar } from "@/lib/permissoes";
import { CANAIS_DIRETOS, FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { salvarCliente } from "../acoes";
import visual from "../cliente.module.css";
import { FormularioCrianca } from "../criancas";
import { GraficoGasto } from "../grafico-gasto";
import { FormularioCliente } from "../formulario-cliente";

export const metadata: Metadata = { title: "Cliente · Salty Baby" };

const NOMES_PEDIDO = { reservado: "Reservado", expirado: "Reserva vencida", cancelado: "Cancelado", pago: "Pago" } as const;
const canal = (c: string) => (c === "site" ? "Site" : (CANAIS_DIRETOS.find((d) => d.valor === c)?.nome ?? c));

export default async function Cliente({ params, searchParams }: PageProps<"/painel/clientes/[id]">) {
  const { id } = await params;
  const usuario = await exigirAcesso("painel", `/painel/clientes/${id}`);
  const administradora = podeAcessar(usuario.perfis, "painel-administracao");
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
      criancas: { orderBy: [{ nascimento: "asc" }, { criadoEm: "asc" }] },
    },
  });
  if (!cliente) notFound();
  const c = cliente;
  const tel = lerTelefoneCliente(c.telefone);
  const gasto = c.vendas.reduce((s, v) => s + v.totalCentavos, 0);
  const tamanhos = [...new Set(c.vendas.flatMap((v) => v.itens.map((i) => i.peca.tamanho)).filter(Boolean))];
  const agora = new Date();
  const hoje = hojeEmSaoPaulo();
  const pecasCompradas = c.vendas.flatMap((v) => v.itens.map((i) => ({ data: v.data, tamanho: i.peca.tamanho, marca: i.peca.marca })));
  const ticketMedio = c.vendas.length ? Math.round(gasto / c.vendas.length) : 0;
  const estimadas = estimarCriancas(pecasCompradas, agora);
  const marcas = marcasPreferidas(pecasCompradas.map((p) => p.marca));
  const mesAno = (d: Date) => formatarData(d).slice(3);

  return (
    <>
      <p>
        <Link href="/painel/clientes">← Clientes</Link>
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
        {administradora && <span>{formatarReais(gasto)} no total</span>}
        {c.vendas[0] && <span>última em {formatarData(c.vendas[0].data)}</span>}
        {tamanhos.length > 0 && <span>tamanhos comprados: {tamanhos.join(", ")}</span>}
        {administradora && c.cpf && <span>CPF {formatarCpf(c.cpf)}</span>}
      </div>

      <h2>Resumo</h2>
      <div className={visual.resumoCliente}>
        <div className={estilos.cartao}>
          <strong>{c.vendas.length}</strong>
          compra(s) · {pecasCompradas.length} peça(s)
        </div>
        {administradora && (
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
      {administradora && c.vendas.length > 0 && <GraficoGasto meses={gastoPorMes(c.vendas, agora)} />}

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
                resumo:
                  idade === undefined
                    ? `${k.nome}: sem data de nascimento.`
                    : `${k.nome}: ${formatarIdade(idade)}, veste ${tamanhoParaIdade(idade)}.`,
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
                {administradora && <th className={estilos.numero}>Total</th>}
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
                  {administradora && (
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
    </>
  );
}
