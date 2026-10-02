import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { listarOpcoesDeClientes } from "@/lib/clientes/opcoes";
import { formatarDataHora, formatarHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { podeAcessar, podeVer, temExtra } from "@/lib/permissoes";
import { liberarReservasVencidas } from "@/lib/pedidos/gravar";
import { formatarTelefone, lerTelefoneCliente, linkWhatsappCliente, minutosRestantes } from "@/lib/pedidos/regras";
import { FORMAS_PAGAMENTO } from "@/lib/vendas/regras";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { cancelarPedido } from "../acoes";
import { DadosCliente, IncluirPeca, TirarPeca } from "./editar-pedido";

export const metadata: Metadata = { title: "Pedido" };

const NOMES = { reservado: "Reservado", expirado: "Reserva vencida", cancelado: "Cancelado", pago: "Pago" } as const;

export default async function PedidoNoPainel({ params, searchParams }: PageProps<"/painel/pedidos/[id]">) {
  const { id } = await params;
  const usuario = await exigirPagina("pedidos", "ver", `/painel/pedidos/${id}`);
  const aviso = await searchParams;
  await liberarReservasVencidas();
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      itens: {
        orderBy: { ordem: "asc" },
        include: {
          peca: {
            select: {
              id: true,
              codigo: true,
              nome: true,
              tamanho: true,
              marca: true,
              status: true,
              fotos: { orderBy: { ordem: "asc" }, take: 1, select: { arquivo: true } },
              fornecedora: { select: { id: true, codigo: true, nome: true } },
            },
          },
        },
      },
      venda: { include: { itens: true } },
      cliente: { include: { _count: { select: { vendas: true } } } },
      grupo: { select: { nome: true } },
    },
  });
  if (!pedido) notFound();
  const administradora = podeAcessar(usuario.perfis, "painel-administracao");
  const confirma = temExtra(usuario.acesso, "confirmar_pagamento");
  const valores = temExtra(usuario.acesso, "valores");
  const aberto = pedido.status === "reservado" || pedido.status === "expirado";
  const itemVendido = (pecaId: string) => pedido.venda?.itens.find((i) => i.pecaId === pecaId);

  const opcoes = await listarOpcoesDeClientes();
  // Sugere a cliente do cadastro com o mesmo WhatsApp, ou com o mesmo nome.
  const mesmoNome = (a: string) => a.trim().toLocaleLowerCase("pt-BR") === pedido.nomeCliente.trim().toLocaleLowerCase("pt-BR");
  const porTelefone = pedido.telefoneCliente ? opcoes.filter((c) => c.tel === pedido.telefoneCliente) : [];
  const porNome = opcoes.filter((c) => mesmoNome(c.nome));
  const sugestao = porTelefone.length === 1 ? porTelefone[0] : porNome.length === 1 ? porNome[0] : undefined;
  const cliente = pedido.cliente;

  return (
    <>
      <p>
        <Link href="/painel/pedidos">← Pedidos</Link>
      </p>
      <h1 className={estilos.titulo}>
        Pedido nº {pedido.numero} · {pedido.nomeCliente}
      </h1>
      {aviso.pago && (
        <p className={proprios.aviso} role="status">
          Pagamento confirmado. A venda foi gravada e as peças saíram da vitrine.
        </p>
      )}
      <p>
        <strong>{NOMES[pedido.status]}</strong>
        {pedido.status === "reservado" &&
          ` até ${formatarHora(pedido.reservadoAte)} (faltam ${minutosRestantes(pedido.reservadoAte, new Date())} min)`}
        {" · feito em "}
        {formatarDataHora(pedido.criadoEm)}
        {pedido.grupo && ` · veio pelo post do grupo ${pedido.grupo.nome}`}
      </p>
      {pedido.status === "expirado" && (
        <p>A reserva venceu e as peças voltaram para a vitrine. Se a cliente pagou, ainda dá para confirmar enquanto as peças estiverem à venda.</p>
      )}
      {aberto && (
        <div className={proprios.acoes}>
          {confirma && (
            <Link href={`/painel/pedidos/${pedido.id}/confirmar`} className={proprios.botao}>
              Confirmar pagamento
            </Link>
          )}
          {pedido.status === "reservado" && (
            <form action={cancelarPedido}>
              <input type="hidden" name="id" value={pedido.id} />
              <button type="submit" className={proprios.botaoSecundario}>
                Cancelar e liberar peças
              </button>
            </form>
          )}
        </div>
      )}

      <h2>Cliente</h2>
      <p>
        <strong>{pedido.nomeCliente}</strong>
        {pedido.telefoneCliente && (
          <>
            {" · WhatsApp "}
            <a href={linkWhatsappCliente(pedido.telefoneCliente)} target="_blank" rel="noopener noreferrer">
              {formatarTelefone(pedido.telefoneCliente)}
            </a>
          </>
        )}
      </p>
      {cliente ? (
        <p>
          No cadastro: <Link href={`/painel/clientes/${cliente.id}`}>{cliente.nome}</Link>
          {cliente.telefone && ` · ${formatarTelefone(lerTelefoneCliente(cliente.telefone) ?? cliente.telefone)}`}
          {cliente.email && ` · ${cliente.email}`}
          {administradora && cliente.cpf && ` · CPF ${cliente.cpf}`}
          {[cliente.endereco, cliente.cidade, cliente.estado].some(Boolean) && (
            <span className={estilos.antigo}>{[cliente.endereco, cliente.cep, cliente.cidade, cliente.estado].filter(Boolean).join(" · ")}</span>
          )}
          <span className={estilos.antigo}>
            {cliente._count.vendas === 0 ? "Nenhuma compra anterior." : `${cliente._count.vendas} compra(s) registrada(s).`}
          </span>
        </p>
      ) : (
        <p className={estilos.antigo}>Ainda não está ligado a uma cliente do cadastro.</p>
      )}
      {pedido.observacao && <p>Observações: {pedido.observacao}</p>}
      <details>
        <summary>Editar dados da cliente</summary>
        <DadosCliente
          id={pedido.id}
          nome={pedido.nomeCliente}
          telefone={pedido.telefoneCliente ? formatarTelefone(pedido.telefoneCliente) : ""}
          clienteId={pedido.clienteId ?? ""}
          observacao={pedido.observacao ?? ""}
          clientes={opcoes.map(({ id, nome, detalhe }) => ({ id, nome, detalhe }))}
          sugestao={sugestao && { id: sugestao.id, nome: sugestao.nome, detalhe: sugestao.detalhe }}
        />
      </details>

      <h2>Peças</h2>
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th aria-label="Foto" />
              <th>Código</th>
              <th>Peça</th>
              <th>Fornecedora</th>
              <th className={estilos.numero}>Preço</th>
              {pedido.venda && valores && (
                <>
                  <th className={estilos.numero}>Pago</th>
                  <th className={estilos.numero}>Repasse</th>
                  <th className={estilos.numero}>Lucro</th>
                </>
              )}
              {aberto && (
                <th aria-label="Tirar" />
              )}
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((i) => {
              const vendido = itemVendido(i.pecaId);
              const foto = i.peca.fotos[0];
              return (
                <tr key={i.pecaId} className={estilos.comFoto}>
                  <td className={estilos.foto}>
                    {foto ? (
                      // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio
                      <img className={estilos.miniatura} src={enderecoDaFoto(foto.arquivo, true)} alt="" loading="lazy" />
                    ) : (
                      <span className={estilos.miniatura} />
                    )}
                  </td>
                  <td className={estilos.curta}>
                    <Link href={`/painel/pecas/${i.peca.id}`} className={estilos.codigo}>
                      {i.peca.codigo}
                    </Link>
                  </td>
                  <td>
                    {i.peca.nome}
                    {(i.peca.tamanho || i.peca.marca) && (
                      <span className={estilos.antigo}>
                        {[i.peca.tamanho && `Tam. ${i.peca.tamanho}`, i.peca.marca].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                  <td data-rotulo="Fornecedora">
                    {i.peca.fornecedora ? (
                      <>
                        {podeVer(usuario.acesso, "fornecedoras") ? (
                          <Link href={`/painel/fornecedoras/${i.peca.fornecedora.id}`}>{i.peca.fornecedora.codigo}</Link>
                        ) : (
                          i.peca.fornecedora.codigo
                        )}{" "}
                        {i.peca.fornecedora.nome}
                      </>
                    ) : (
                      "Peça da loja"
                    )}
                  </td>
                  <td className={estilos.numero} data-rotulo="Preço">
                    {formatarReais(i.precoCentavos)}
                  </td>
                  {vendido && valores && (
                    <>
                      <td className={estilos.numero} data-rotulo="Pago">
                        {formatarReais(vendido.valorPagoCentavos)}
                      </td>
                      <td className={estilos.numero} data-rotulo="Repasse">
                        {formatarReais(vendido.repasseCentavos)}
                      </td>
                      <td className={estilos.numero} data-rotulo="Lucro">
                        {formatarReais(vendido.lucroCentavos)}
                      </td>
                    </>
                  )}
                  {aberto && (
                    <td>
                      {pedido.itens.length > 1 && <TirarPeca id={pedido.id} pecaId={i.pecaId} codigo={i.peca.codigo} />}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        Total do pedido: <strong>{formatarReais(pedido.totalCentavos)}</strong>
        {pedido.venda && pedido.venda.descontoCentavos > 0 && (
          <>
            {" · desconto "}
            {formatarReais(pedido.venda.descontoCentavos)}
            {" · pago "}
            <strong>{formatarReais(pedido.venda.totalCentavos)}</strong>
          </>
        )}
        {pedido.venda?.formaPagamento && ` · ${FORMAS_PAGAMENTO.find((f) => f.valor === pedido.venda?.formaPagamento)?.nome}`}
        {pedido.venda?.motivoDesconto && ` · motivo do desconto: ${pedido.venda.motivoDesconto}`}
      </p>
      {aberto && <IncluirPeca id={pedido.id} />}
    </>
  );
}
