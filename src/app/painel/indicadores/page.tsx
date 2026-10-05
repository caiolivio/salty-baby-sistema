import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { lerPeriodo } from "@/lib/clientes/perfil";
import { formatarReais } from "@/lib/dinheiro";
import {
  DIAS_PARADA,
  clientesDoPeriodo,
  conversaoDePedidos,
  diasAteVender,
  estoque,
  numerosDasVendas,
  periodoAnterior,
  rankingsDoPeriodo,
  variacao,
  type Fatia,
} from "@/lib/indicadores/regras";
import { dadosDosIndicadores } from "@/lib/indicadores/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import estilos from "../painel.module.css";
import { EscolherPeriodo } from "./escolher-periodo";
import ind from "./indicadores.module.css";

export const metadata: Metadata = { title: "Indicadores" };

const formatarData = (t: string) => t.split("-").reverse().join("/");
const pecasTexto = (n: number) => `${n} ${n === 1 ? "peça" : "peças"}`;

function Numero({ titulo, atual, anterior, mostrar }: { titulo: string; atual: number; anterior: number; mostrar: (n: number) => string }) {
  const v = variacao(atual, anterior);
  return (
    <div className={ind.numero}>
      <span>{titulo}</span>
      <strong>{mostrar(atual)}</strong>
      <small className={v === null || v === 0 ? undefined : v > 0 ? ind.subiu : ind.caiu}>
        {v !== null && v > 0 && <ArrowUpRight className="icone" aria-hidden />}
        {v !== null && v < 0 && <ArrowDownRight className="icone" aria-hidden />}
        {v === null ? "sem comparação" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}%`}
        <span>(antes: {mostrar(anterior)})</span>
      </small>
    </div>
  );
}

function Ranking({ titulo, fatias }: { titulo: string; fatias: Fatia[] }) {
  const maior = Math.max(1, ...fatias.map((f) => f.valorCentavos));
  return (
    <section className={ind.caixa}>
      <h2>{titulo}</h2>
      {fatias.length === 0 ? (
        <p className={ind.vazio}>Nenhuma venda no período.</p>
      ) : (
        <ol className={ind.barras}>
          {fatias.map((f) => (
            <li key={f.nome}>
              <span className={ind.nome} title={f.nome}>
                {f.nome}
              </span>
              <span className={ind.valor}>
                {formatarReais(f.valorCentavos)} <small>· {pecasTexto(f.quantidade)}</small>
              </span>
              <span className={ind.trilho} aria-hidden>
                <span style={{ width: `${Math.max(2, (f.valorCentavos / maior) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// Indicadores: os números do negócio num período, comparados com o período
// anterior, o que mais vende e as peças paradas. Só a administradora.
export default async function Indicadores({ searchParams }: PageProps<"/painel/indicadores">) {
  await exigirAcesso("painel-administracao", "/painel/indicadores");
  const hoje = hojeEmSaoPaulo();
  const filtro = await searchParams;
  const periodo = lerPeriodo({ ...filtro, periodo: filtro.periodo ?? "mensal" }, hoje);
  const antes = periodoAnterior(periodo);
  const { vendas, primeiraCompra, pecas, pedidos } = await dadosDosIndicadores(antes.de, periodo.ate);
  const pedidosDoPeriodo = pedidos.filter((p) => p.criadoEm.toISOString().slice(0, 10) >= periodo.de);

  const agora = numerosDasVendas(vendas, periodo.de, periodo.ate);
  const anterior = numerosDasVendas(vendas, antes.de, antes.ate);
  const r = rankingsDoPeriodo(vendas, periodo.de, periodo.ate);
  const dias = diasAteVender(vendas, periodo.de, periodo.ate);
  const clientes = clientesDoPeriodo(vendas, periodo.de, periodo.ate, primeiraCompra);
  const pedidosSite = conversaoDePedidos(pedidosDoPeriodo);
  const est = estoque(pecas, hoje);
  const reais = (n: number) => formatarReais(n);
  const contagem = (n: number) => n.toLocaleString("pt-BR");

  return (
    <>
      <h1 className={estilos.titulo}>Indicadores</h1>
      <EscolherPeriodo periodo={periodo} hoje={hoje} />
      <p className={ind.comparacao}>
        {formatarData(periodo.de)} a {formatarData(periodo.ate)}, comparado com {formatarData(antes.de)} a {formatarData(antes.ate)}.
      </p>

      <div className={ind.numeros}>
        <Numero titulo="Faturamento" atual={agora.faturamentoCentavos} anterior={anterior.faturamentoCentavos} mostrar={reais} />
        <Numero titulo="Lucro das vendas" atual={agora.lucroCentavos} anterior={anterior.lucroCentavos} mostrar={reais} />
        <Numero titulo="Vendas" atual={agora.vendas} anterior={anterior.vendas} mostrar={contagem} />
        <Numero titulo="Peças vendidas" atual={agora.pecas} anterior={anterior.pecas} mostrar={contagem} />
        <Numero titulo="Ticket médio" atual={agora.ticketMedioCentavos} anterior={anterior.ticketMedioCentavos} mostrar={reais} />
      </div>

      <div className={ind.grade}>
        <section className={ind.caixa}>
          <h2>Clientes</h2>
          <ul className={ind.lista}>
            <li>
              <span>Compraram no período</span>
              <span>{clientes.compraram}</span>
            </li>
            <li>
              <span>Primeira compra</span>
              <span>{clientes.novas}</span>
            </li>
            <li>
              <span>Voltaram a comprar</span>
              <span>{clientes.voltaram}</span>
            </li>
          </ul>
        </section>
        <section className={ind.caixa}>
          <h2>Pedidos do site</h2>
          <ul className={ind.lista}>
            <li>
              <span>Pedidos fechados</span>
              <span>{pedidosSite.fechados}</span>
            </li>
            <li>
              <span>Pagos</span>
              <span>{pedidosSite.pagos}</span>
            </li>
            <li>
              <span>Não pagos (reserva vencida ou cancelado)</span>
              <span>{pedidosSite.perdidos}</span>
            </li>
            {pedidosSite.abertos > 0 && (
              <li>
                <span>Aguardando pagamento</span>
                <span>{pedidosSite.abertos}</span>
              </li>
            )}
            <li>
              <span>Viraram venda</span>
              <span>{pedidosSite.taxa === null ? "—" : `${pedidosSite.taxa}%`}</span>
            </li>
          </ul>
        </section>
        <section className={ind.caixa}>
          <h2>Estoque à venda hoje</h2>
          <ul className={ind.lista}>
            <li>
              <span>Peças à venda</span>
              <span>{est.pecas}</span>
            </li>
            <li>
              <span>Valor (preço de hoje)</span>
              <span>{formatarReais(est.valorCentavos)}</span>
            </li>
            <li>
              <span>Tempo até vender (mediana)</span>
              <span>{dias === null ? "—" : `${dias} ${dias === 1 ? "dia" : "dias"}`}</span>
            </li>
            <li>
              <span>Paradas há mais de {DIAS_PARADA} dias</span>
              <span>
                {est.paradas.length} · {formatarReais(est.valorParadoCentavos)}
              </span>
            </li>
          </ul>
        </section>
      </div>

      <div className={ind.grade}>
        <Ranking titulo="Canais de venda" fatias={r.canais} />
        <Ranking titulo="Grupos de WhatsApp" fatias={r.grupos} />
        <Ranking titulo="Formas de pagamento" fatias={r.formas} />
        <Ranking titulo="Fornecedoras que mais venderam" fatias={r.fornecedoras} />
        <Ranking titulo="Marcas" fatias={r.marcas} />
        <Ranking titulo="Categorias" fatias={r.categorias} />
        <Ranking titulo="Tamanhos" fatias={r.tamanhos} />
      </div>

      <section className={ind.caixa}>
        <h2>Peças paradas há mais de {DIAS_PARADA} dias</h2>
        {est.paradas.length === 0 ? (
          <p className={ind.vazio}>Nenhuma peça parada. Ótimo!</p>
        ) : (
          <ul className={ind.lista}>
            {est.paradas.slice(0, 30).map((p) => (
              <li key={p.id}>
                <span>
                  <Link href={`/painel/pecas/${p.id}`}>{p.codigo}</Link> {p.nome}
                </span>
                <span>
                  {p.dias} dias · {formatarReais(p.precoCentavos)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {est.paradas.length > 30 && <p className={ind.vazio}>E mais {est.paradas.length - 30} peças.</p>}
      </section>
    </>
  );
}
