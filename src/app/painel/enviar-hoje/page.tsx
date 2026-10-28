import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { AlertTriangle, ArrowRight, Bell } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { podeAlterar, temExtra } from "@/lib/permissoes";
import { formatarData } from "@/lib/datas";
import { formatarTelefone } from "@/lib/pedidos/regras";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { lerLoja } from "@/lib/loja/servidor";
import { linkDaVitrine } from "@/lib/vitrine";
import {
  mensagemAniversario,
  mensagemClienteSumida,
  mensagemPecaVendida,
  mensagemPedidoNaoPago,
} from "@/lib/hoje/regras";
import { aniversariosDaSemana, clientesSumidas, pecasVendidasParaAvisar, pedidosNaoPagos } from "@/lib/hoje/servidor";
import { pendenciasDeHoje } from "@/lib/hoje/pendencias";
import estilos from "../painel.module.css";
import proprios from "../formulario.module.css";
import visual from "./enviar-hoje.module.css";
import { EnviarMensagem } from "./enviar-mensagem";

export const metadata: Metadata = { title: "Enviar hoje" };

export default async function EnviarHoje() {
  const usuario = await exigirAcesso("painel", "/painel/enviar-hoje");
  const { acesso } = usuario;
  const admin = acesso.administradora;
  const clientes = podeAlterar(acesso, "clientes");
  const pedidos = podeAlterar(acesso, "pedidos");
  const agora = new Date();
  const origem = origemDaRequisicao(await headers()).replace(/\/+$/, "");
  const vitrine = (tamanho: string) => `${origem}${linkDaVitrine({ pagina: 1 }, { tamanho: tamanho as never })}`;

  const [loja, pendencias, vendidas, naoPagos, sumidas, aniversarios] = await Promise.all([
    lerLoja(),
    pendenciasDeHoje(acesso, agora),
    admin ? pecasVendidasParaAvisar(agora) : [],
    pedidos ? pedidosNaoPagos(agora) : [],
    clientes ? clientesSumidas(agora) : [],
    clientes ? aniversariosDaSemana(agora) : [],
  ]);
  const nada =
    !pendencias.backup &&
    pendencias.lembretes.length === 0 &&
    pendencias.listas.length === 0 &&
    vendidas.length + naoPagos.length + sumidas.length + aniversarios.length === 0;

  return (
    <>
      <h1 className={estilos.titulo}>Enviar hoje</h1>
      <p className={proprios.dica}>
        Tudo o que precisa sair hoje, com a mensagem pronta. Ao tocar em &quot;Enviar no WhatsApp&quot; ou &quot;Copiar texto&quot;, o
        item sai da lista.
      </p>

      {pendencias.backup && temExtra(acesso, "backup") && (
        <p className={visual.alerta} role="alert">
          <AlertTriangle className="icone" aria-hidden />
          <span>
            {pendencias.backup.texto} <Link href="/painel/backup">Abrir o Backup</Link>
          </span>
        </p>
      )}

      {nada && <p className={visual.vazio}>Nada para enviar hoje. 🎉</p>}

      {(pendencias.lembretes.length > 0 || pendencias.listas.length > 0) && (
        <section aria-labelledby="rotina">
          <h2 id="rotina">Para fazer</h2>
          <ul className={visual.tarefas}>
            {pendencias.lembretes.map((l) => (
              <li key={l.chave}>
                <Link href={l.href}>
                  <Bell className="icone" aria-hidden />
                  <span>
                    <strong>{l.titulo}</strong>
                    {l.texto}
                  </span>
                  <ArrowRight className="icone" aria-hidden />
                </Link>
              </li>
            ))}
            {pendencias.listas.map((l) => (
              <li key={l.chave}>
                <Link href={l.href}>
                  <strong className={visual.numero}>{l.quantidade}</strong>
                  <span>
                    <strong>{l.titulo}</strong>
                    {l.texto}
                  </span>
                  <ArrowRight className="icone" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {vendidas.length > 0 && (
        <section aria-labelledby="vendidas">
          <h2 id="vendidas">Sua peça vendeu! ({vendidas.length})</h2>
          <p className={proprios.dica}>Avise cada fornecedora das vendas dos últimos 14 dias, com quanto ela vai receber.</p>
          <ul className={visual.mensagens}>
            {vendidas.map((v) => (
              <li key={v.referencia}>
                <strong>
                  <Link href={`/painel/fornecedoras/${v.fornecedora.id}`}>
                    {v.fornecedora.codigo} · {v.fornecedora.nome}
                  </Link>
                </strong>
                <span className={proprios.dica}>
                  Venda de {formatarData(new Date(`${v.dataVenda}T00:00:00Z`))} · {v.pecas.map((p) => p.codigo).join(", ")}
                  {v.fornecedora.telefone ? ` · ${formatarTelefone(v.fornecedora.telefone)}` : " · sem WhatsApp no cadastro"}
                </span>
                <EnviarMensagem
                  tipo="peca_vendida"
                  referencia={v.referencia}
                  telefone={v.fornecedora.telefone}
                  texto={mensagemPecaVendida({
                    nomeFornecedora: v.fornecedora.nome,
                    nomeLoja: loja.nome,
                    pecas: v.pecas,
                    dataVenda: v.dataVenda,
                    linkArea: `${origem}/fornecedora`,
                  })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {naoPagos.length > 0 && (
        <section aria-labelledby="nao-pagos">
          <h2 id="nao-pagos">Pedidos não pagos ({naoPagos.length})</h2>
          <p className={proprios.dica}>
            Pedidos do site cuja reserva acabou sem pagamento nos últimos 3 dias. A mensagem leva só as peças que ainda estão à
            venda.
          </p>
          <ul className={visual.mensagens}>
            {naoPagos.map((p) => (
              <li key={p.id}>
                <strong>
                  <Link href={`/painel/pedidos/${p.id}`}>Pedido nº {p.numero}</Link> · {p.nomeCliente}
                </strong>
                <span className={proprios.dica}>
                  {p.pecas.length === 1 ? "1 peça ainda à venda" : `${p.pecas.length} peças ainda à venda`}
                  {p.telefone && ` · ${formatarTelefone(p.telefone)}`}
                </span>
                <EnviarMensagem
                  tipo="pedido_nao_pago"
                  referencia={p.id}
                  telefone={p.telefone}
                  texto={mensagemPedidoNaoPago({
                    nomeCliente: p.nomeCliente,
                    nomeLoja: loja.nome,
                    numero: p.numero,
                    pecas: p.pecas.map((x) => ({ ...x, link: `${origem}${x.endereco}` })),
                  })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {aniversarios.length > 0 && (
        <section aria-labelledby="aniversarios">
          <h2 id="aniversarios">Aniversários da semana ({aniversarios.length})</h2>
          <p className={proprios.dica}>Crianças cadastradas que fazem aniversário nos próximos 7 dias, com as peças no tamanho novo.</p>
          <ul className={visual.mensagens}>
            {aniversarios.map((a) => (
              <li key={a.referencia}>
                <strong>
                  {a.crianca.nome || "Criança"} · {a.anos} {a.anos === 1 ? "ano" : "anos"} em {formatarData(new Date(`${a.dia}T00:00:00Z`))}
                </strong>
                <span className={proprios.dica}>
                  <Link href={`/painel/clientes/${a.cliente.id}`}>{a.cliente.nome}</Link> · {formatarTelefone(a.cliente.telefone)}
                  {a.tamanho && a.quantidade > 0 && ` · tamanho ${a.tamanho}: ${a.quantidade} à venda`}
                </span>
                <EnviarMensagem
                  tipo="aniversario"
                  referencia={a.referencia}
                  telefone={a.cliente.telefone}
                  texto={mensagemAniversario({
                    nomeCliente: a.cliente.nome,
                    nomeLoja: loja.nome,
                    nomeCrianca: a.crianca.nome,
                    anos: a.anos,
                    dia: a.dia,
                    tamanho: a.tamanho,
                    quantidade: a.quantidade,
                    link: a.tamanho && a.quantidade > 0 ? vitrine(a.tamanho) : `${origem}/`,
                  })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {sumidas.length > 0 && (
        <section aria-labelledby="sumidas">
          <h2 id="sumidas">Clientes com saudade ({sumidas.length})</h2>
          <p className={proprios.dica}>
            Clientes sem compra há mais de 60 dias, com as novidades no tamanho das crianças delas desde a última compra.
          </p>
          <ul className={visual.mensagens}>
            {sumidas.map((c) => (
              <li key={c.id}>
                <strong>
                  <Link href={`/painel/clientes/${c.id}`}>{c.nome}</Link>
                </strong>
                <span className={proprios.dica}>
                  Última compra em {formatarData(c.ultimaCompra)} · {formatarTelefone(c.telefone)}
                  {c.novidades.some((n) => n.quantidade > 0) &&
                    ` · ${c.novidades
                      .filter((n) => n.quantidade > 0)
                      .map((n) => `tam. ${n.tamanho}: ${n.quantidade} ${n.quantidade === 1 ? "nova" : "novas"}`)
                      .join(", ")}`}
                </span>
                <EnviarMensagem
                  tipo="cliente_sumida"
                  referencia={`${c.id}:${c.mes}`}
                  telefone={c.telefone}
                  texto={mensagemClienteSumida({
                    nomeCliente: c.nome,
                    nomeLoja: loja.nome,
                    novidades: c.novidades.map((n) => ({ ...n, link: vitrine(n.tamanho) })),
                    linkLoja: `${origem}/`,
                  })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
