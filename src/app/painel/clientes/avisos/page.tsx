import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Voltar } from "@/componentes/voltar";
import { exigirPagina } from "@/lib/acesso";
import { descricaoDoAlerta, mensagemDoAlerta } from "@/lib/alertas/regras";
import { avisosPendentes } from "@/lib/alertas/servidor";
import { prisma } from "@/lib/banco";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { enderecoDaFoto } from "@/lib/fotos";
import { lerLoja } from "@/lib/loja/servidor";
import { formatarTelefone } from "@/lib/pedidos/regras";
import { podeAlterar } from "@/lib/permissoes";
import { enderecoDaPeca } from "@/lib/vitrine";
import estilos from "../../painel.module.css";
import proprio from "../../sacolinhas/sacolinhas.module.css";
import { EnviarAvisoDeChegada } from "./enviar";
import { mensagemDaFila, ordinal } from "@/lib/fila/regras";
import { filasParaAvisar } from "@/lib/fila/servidor";

export const metadata: Metadata = { title: "Avisos de chegada" };

// Lista "enviar hoje": clientes que pediram "me avise quando chegar" e têm peça
// nova que combina. A loja manda pelo WhatsApp; cada peça é avisada uma vez só.
export default async function AvisosDeChegada() {
  const usuario = await exigirPagina("clientes", "ver", "/painel/clientes/avisos");
  const pode = podeAlterar(usuario.acesso, "clientes");
  const [pendentes, loja, categorias, totalAlertas, filas] = await Promise.all([
    avisosPendentes(),
    lerLoja(),
    prisma.categoria.findMany({ select: { id: true, nome: true } }),
    prisma.alerta.count(),
    filasParaAvisar(),
  ]);
  const origem = origemDaRequisicao(await headers()).replace(/\/+$/, "");
  const nomeDa = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? null;

  return (
    <>
      <p>
        <Voltar href="/painel/clientes">Clientes</Voltar>
      </p>
      <h1 className={estilos.titulo}>Avisos de chegada</h1>
      <p>
        Clientes que pediram &quot;me avise quando chegar&quot; e têm peça nova do jeito que pediram. Toque em &quot;Enviar no
        WhatsApp&quot;: a mensagem já vem pronta, e essas peças não entram de novo no próximo aviso.
      </p>
      {filas.length > 0 && (
        <>
          <h2>Fila de espera: peças que voltaram</h2>
          <p>
            Estas peças estavam reservadas, a reserva não foi paga e elas voltaram para a vitrine. Avise quem estava na fila, na
            ordem. Quem fechar o pedido primeiro leva.
          </p>
          {filas.map(({ peca, clientes }) => (
            <section key={peca.id} className={proprio.aviso} aria-label={`Fila de ${peca.codigo}`}>
              <h3>
                <Link href={`/painel/pecas/${peca.id}`}>
                  {peca.codigo} · {peca.nome}
                </Link>
              </h3>
              {clientes.map((c, i) => (
                <div key={c.entradaId}>
                  <p>
                    <strong>{ordinal(i + 1)}</strong> <Link href={`/painel/clientes/${c.id}`}>{c.nome}</Link>
                    {c.telefone ? ` · ${formatarTelefone(c.telefone)}` : " · sem WhatsApp na ficha"}
                  </p>
                  {pode && (
                    <EnviarAvisoDeChegada
                      clienteId={c.id}
                      entradaFila={c.entradaId}
                      telefone={c.telefone}
                      texto={mensagemDaFila({
                        nomeCliente: c.nome,
                        nomeCurto: loja.nomeCurto,
                        peca: { ...peca, link: `${origem}${enderecoDaPeca(peca.codigo)}` },
                      })}
                    />
                  )}
                </div>
              ))}
            </section>
          ))}
          <h2>Me avise quando chegar</h2>
        </>
      )}
      <p className={estilos.contagem}>
        {totalAlertas === 1 ? "1 aviso pedido" : `${totalAlertas} avisos pedidos`} ·{" "}
        {pendentes.length === 1 ? "1 cliente para avisar hoje" : `${pendentes.length} clientes para avisar hoje`}
      </p>
      {pendentes.length === 0 && <p>Ninguém para avisar agora. Quando chegar peça que alguém pediu, ela aparece aqui.</p>}
      {pendentes.map(({ cliente, alertas, pecas }) => {
        const texto = mensagemDoAlerta({
          nomeCliente: cliente.nome,
          nomeCurto: loja.nomeCurto,
          pecas: pecas.map((p) => ({ ...p, link: `${origem}${enderecoDaPeca(p.codigo)}` })),
          linkAlertas: `${origem}/minha-conta/avisos`,
        });
        return (
          <section key={cliente.id} className={proprio.aviso} aria-label={`Aviso para ${cliente.nome}`}>
            <h2>
              <Link href={`/painel/clientes/${cliente.id}`}>{cliente.nome}</Link>
              {cliente.telefone ? ` · ${formatarTelefone(cliente.telefone)}` : " · sem WhatsApp na ficha"}
            </h2>
            <p className={estilos.contagem}>Pediu: {alertas.map((a) => descricaoDoAlerta(a, nomeDa(a.categoriaId))).join("; ")}</p>
            <ul className={estilos.miniaturas}>
              {pecas.map((p) => (
                <li key={p.id}>
                  <Link href={`/painel/pecas/${p.id}`} title={`${p.codigo} · ${p.nome}`}>
                    {p.fotos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida
                      <img className={estilos.miniatura} src={enderecoDaFoto(p.fotos[0].arquivo, true)} alt="" />
                    ) : (
                      <span className={estilos.miniatura} />
                    )}
                    <span>{p.codigo}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <pre className={estilos.textoPronto}>{texto}</pre>
            {pode && (
              <EnviarAvisoDeChegada
                clienteId={cliente.id}
                pecaIds={pecas.slice(0, 10).map((p) => p.id)}
                texto={texto}
                telefone={cliente.telefone ?? null}
              />
            )}
          </section>
        );
      })}
    </>
  );
}
