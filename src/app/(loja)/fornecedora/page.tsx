import type { Metadata } from "next";
import Link from "next/link";
import { GraficoBarras } from "@/componentes/grafico-barras";
import { Passos } from "@/componentes/passos";
import { exigirAcesso } from "@/lib/acesso";
import { lerPeriodo } from "@/lib/clientes/perfil";
import { formatarDia } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { dadosDaFornecedora } from "@/lib/fornecedoras/area";
import { PASSOS, situacaoDosPassos } from "@/lib/fornecedoras/candidatura";
import { situacaoNaArea } from "@/lib/fornecedoras/candidaturas";
import { etapaDaFornecedora, PASSOS_PRIMEIRO_ACESSO } from "@/lib/fornecedoras/conta";
import { calcularSaldos, vendasNoPeriodo } from "@/lib/fornecedoras/saldos";
import { saldoParaCompras } from "@/lib/fornecedoras/saldo-para-compras";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { formatarTelefone } from "@/lib/pedidos/regras";
import estilos from "../loja.module.css";
import { aceitar, concluirBoasVindas } from "./acoes";
import { ComoFuncionaAArea, TextoDoAcordo } from "./acordo-texto";
import { EscolherPeriodo } from "./escolher-periodo";
import { FormularioDados } from "./formulario-dados";
import { EnviarPecas } from "./propostas";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Área da fornecedora", robots: { index: false } };

async function AceiteDoAcordo({ falta, texto }: { falta: boolean; texto: string }) {
  const loja = await lerLoja();
  return (
    <section className={estilos.secaoArea} aria-labelledby="regras">
      <h2 id="regras">Regras da consignação</h2>
      <TextoDoAcordo />
      {falta && (
        <p className={estilos.erro} role="alert">
          Para continuar, marque que leu e está de acordo.
        </p>
      )}
      <form action={aceitar} className={estilos.formConta}>
        <label className={estilos.marcarLinha}>
          <input type="checkbox" name="de_acordo" value="sim" required />
          <span>Li e estou de acordo com as regras da consignação da {loja.nome}.</span>
        </label>
        <button type="submit" className={estilos.botaoWhats}>
          {texto}
        </button>
      </form>
    </section>
  );
}

export default async function AreaDaFornecedora({ searchParams }: PageProps<"/fornecedora">) {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const parametros = await searchParams;
  const situacao = await situacaoNaArea(usuario.id);
  const loja = await lerLoja();

  if (situacao.tipo === "sem-cadastro") {
    return (
      <section className={estilos.explicacao}>
        <h1 className={estilos.tituloPagina}>Sua área ainda não está pronta</h1>
        <p>Fale com a {loja.nomeCurto} pelo WhatsApp para terminar o seu cadastro de fornecedora.</p>
      </section>
    );
  }

  if (situacao.tipo === "candidata") {
    const { candidatura } = situacao;
    if (candidatura.etapa === "recusada" || candidatura.etapa === "enviada") {
      return (
        <section className={estilos.explicacao}>
          <h1 className={estilos.tituloPagina}>Seja uma fornecedora</h1>
          <p>
            {candidatura.etapa === "recusada"
              ? `Desta vez a sua inscrição não foi aprovada. Obrigada pelo interesse! Se quiser, fale com a ${loja.nomeCurto} pelo WhatsApp.`
              : `A curadoria ainda está avaliando as suas peças. A ${loja.nomeCurto} entra em contato pelo WhatsApp.`}
          </p>
        </section>
      );
    }
    const dono = { candidaturaId: candidatura.id };
    if (candidatura.etapa === "acordo_aceito") {
      return (
        <>
          <h1 className={estilos.tituloPagina}>Passo 2 concluído!</h1>
          <Passos nomes={PASSOS} situacoes={situacaoDosPassos(2, true)} />
          <section className={estilos.explicacao}>
            <p>
              Você aceitou o acordo de consignação. Agora <strong>a {loja.nomeCurto} entra em contato pelo WhatsApp</strong> para combinar
              a entrega das peças e finalizar a sua parceria (passo 3).
            </p>
            <p>Enquanto isso, você pode continuar mandando peças.</p>
          </section>
          <EnviarPecas dono={dono} titulo="Mostrar mais peças" />
        </>
      );
    }
    // Etapa "aprovada": passo 2.
    return (
      <>
        <h1 className={estilos.tituloPagina}>Suas peças foram aprovadas!</h1>
        <Passos nomes={PASSOS} situacoes={situacaoDosPassos(2)} />
        <section className={estilos.explicacao}>
          <p>
            Agora é o <strong>passo 2</strong>: mostre mais peças que você quer deixar com a {loja.nomeCurto}, com os detalhes de cada
            uma, e leia e aceite as regras da consignação no fim da página.
          </p>
        </section>
        <EnviarPecas dono={dono} titulo="Mostrar mais peças" />
        <AceiteDoAcordo falta={Boolean(parametros.faltaAceite)} texto="Aceitar e concluir o passo 2" />
      </>
    );
  }

  const { fornecedora } = situacao;
  const etapa = etapaDaFornecedora(fornecedora);
  // Quem veio pelo "Seja uma fornecedora" segue os 4 passos da inscrição; quem
  // já era parceira (importada) segue os 3 passos do primeiro acesso.
  const veioDaInscricao = Boolean(fornecedora.candidatura);

  if (etapa === "dados") {
    return (
      <>
        <h1 className={estilos.tituloPagina}>Termine o seu cadastro</h1>
        <Passos nomes={PASSOS_PRIMEIRO_ACESSO} situacoes={["atual", "pendente", "pendente"]} />
        <section className={estilos.explicacao}>
          <p>
            Para liberar a sua área, complete os seus dados. <strong>Nome, e-mail e endereço são obrigatórios.</strong>
          </p>
        </section>
        <FormularioDados
          textoBotao="Salvar e continuar"
          iniciais={{
            nome: fornecedora.nome,
            email: fornecedora.email ?? "",
            telefone: fornecedora.telefone ? formatarTelefone(fornecedora.telefone) : "",
            endereco: fornecedora.endereco ?? "",
            cep: fornecedora.cep ?? "",
            cidade: fornecedora.cidade ?? "",
            estado: fornecedora.estado ?? "",
            pix: fornecedora.pix ?? "",
          }}
        />
      </>
    );
  }

  if (etapa === "acordo") {
    return (
      <>
        <h1 className={estilos.tituloPagina}>Leia e aceite o acordo</h1>
        <Passos nomes={PASSOS_PRIMEIRO_ACESSO} situacoes={["feito", "atual", "pendente"]} />
        <section className={estilos.explicacao}>
          <p>Seus dados foram salvos. Falta só ler e aceitar as regras da consignação para liberar a sua área.</p>
        </section>
        <AceiteDoAcordo falta={Boolean(parametros.faltaAceite)} texto="Aceitar e continuar" />
      </>
    );
  }

  if (etapa === "parabens") {
    return (
      <>
        {veioDaInscricao ? (
          <Passos nomes={PASSOS} situacoes={situacaoDosPassos(3, true)} />
        ) : (
          <Passos nomes={PASSOS_PRIMEIRO_ACESSO} situacoes={["feito", "feito", "feito"]} />
        )}
        <section className={estilos.parabens}>
          <h1>
            {veioDaInscricao ? `Parabéns, você agora é parceira da ${loja.nome}! 🎉` : "Parabéns, cadastro finalizado! 🎉"}
          </h1>
          <p>
            Seu código de fornecedora é <strong>{fornecedora.codigo}</strong>. Ele aparece no código de cada peça sua.
          </p>
        </section>
        <section className={estilos.secaoArea}>
          <h2>O que tem na sua área</h2>
          <ComoFuncionaAArea />
          <p>
            Quanto mais peças, mais chances de venda! Sempre que tiver roupas, calçados ou brinquedos que não usa mais, mande
            as fotos em <strong>Enviar peças</strong>.
          </p>
          <details>
            <summary>
              Ver o acordo que você aceitou
              {fornecedora.termosAceitosEm && ` em ${formatarDia(fornecedora.termosAceitosEm)}`}
            </summary>
            <TextoDoAcordo />
          </details>
          <form action={concluirBoasVindas}>
            <button type="submit" className={estilos.botaoWhats}>
              Ir para a minha área
            </button>
          </form>
        </section>
      </>
    );
  }

  // Área liberada: resumo com saldos e gráficos.
  const hoje = hojeEmSaoPaulo();
  const periodo = lerPeriodo(
    { periodo: parametros.periodo ?? "mensal", mes: parametros.mes, de: parametros.de, ate: parametros.ate },
    hoje,
  );
  const [{ pecas, itens }, credito] = await Promise.all([dadosDaFornecedora(fornecedora.id), saldoParaCompras(fornecedora.id)]);
  const saldos = calcularSaldos(pecas, itens);
  const noPeriodo = vendasNoPeriodo(itens, periodo);
  const contagem = {
    aVenda: pecas.filter((p) => p.status === "publicada" || p.status === "reservada").length,
    emCadastro: pecas.filter((p) => p.status === "rascunho").length,
    vendidas: pecas.filter((p) => ["vendida", "na_sacolinha", "enviada", "retirada"].includes(p.status)).length,
    devolucao: pecas.filter((p) => p.status === "devolucao_pedida").length,
  };

  return (
    <>
      <h1 className={estilos.tituloPagina}>Resumo</h1>
      <section className={estilos.secaoArea} aria-labelledby="saldos">
        <h2 id="saldos">Seus saldos</h2>
        <div className={estilos.saldos}>
          <div className={`${estilos.saldo} ${estilos.saldoDestaque}`}>
            <span>Vendidas · total a receber</span>
            <strong>{formatarReais(credito.aReceberCentavos)}</strong>
            <span>
              Repasse das peças vendidas que ainda não foi pago
              {credito.usadoPendenteCentavos > 0 && `, já sem os ${formatarReais(credito.usadoPendenteCentavos)} usados em compras`}.
            </span>
          </div>
          <div className={estilos.saldo}>
            <span>Saldo para compras</span>
            <strong>{formatarReais(credito.disponivelCentavos)}</strong>
            <span>
              Para comprar na {loja.nomeCurto}
              {credito.bonusCentavos > 0 && `, com ${formatarReais(credito.bonusCentavos)} de bônus`}.
            </span>
          </div>
          <div className={estilos.saldo}>
            <span>À venda</span>
            <strong>{formatarReais(saldos.aVendaCentavos)}</strong>
            <span>
              Quanto você recebe se as {saldos.pecasAVenda} peça(s) à venda forem vendidas pelo preço de hoje.
            </span>
          </div>
          <div className={estilos.saldo}>
            <span>Acumulado</span>
            <strong>{formatarReais(saldos.acumuladoCentavos)}</strong>
            <span>Tudo o que você já ganhou ({formatarReais(saldos.acumuladoCentavos - credito.aReceberCentavos)} já pago ou usado em compras).</span>
          </div>
        </div>
        <div className={estilos.bonus} role="note">
          <strong>Ganhe 10% a mais comprando com o seu saldo!</strong> Use todo o seu saldo a receber numa compra na {loja.nomeCurto} e ganhe
          10% do valor usado como bônus para a próxima compra. Por exemplo: com R$ 100,00 de saldo, você compra R$ 100,00 e ganha
          R$ 10,00 de bônus. Se usar só uma parte (R$ 99,00, por exemplo), não há bônus.
          {credito.aReceberCentavos > 0 && (
            <>
              {" "}
              Hoje, usando os seus {formatarReais(credito.aReceberCentavos)}, você ganha{" "}
              <strong>{formatarReais(Math.round(credito.aReceberCentavos / 10))}</strong>.
            </>
          )}{" "}
          O bônus vale só para compras, não é pago em dinheiro. Para usar o saldo, monte o seu pedido no site e marque “Pagar com o meu
          saldo” ao fechar o pedido.
          <p>
            <Link href="/" className={estilos.botaoWhats}>
              Comprar agora
            </Link>
          </p>
        </div>
      </section>

      <section className={estilos.secaoArea} aria-labelledby="vendas-periodo">
        <h2 id="vendas-periodo">Vendas · {periodo.rotulo}</h2>
        <EscolherPeriodo periodo={periodo} hoje={hoje} />
        <div className={estilos.saldos}>
          <div className={estilos.saldo}>
            <span>Peças vendidas</span>
            <strong>{noPeriodo.pecas}</strong>
          </div>
          <div className={estilos.saldo}>
            <span>Valor das vendas</span>
            <strong>{formatarReais(noPeriodo.vendidoCentavos)}</strong>
          </div>
          <div className={estilos.saldo}>
            <span>Para você (repasse)</span>
            <strong>{formatarReais(noPeriodo.repasseCentavos)}</strong>
          </div>
        </div>
        <GraficoBarras
          titulo="Quanto você ganhou com as vendas"
          formato="reais"
          barras={noPeriodo.barras.map((b) => ({ chave: b.chave, rotulo: b.rotulo, valor: b.repasseCentavos }))}
        />
        <GraficoBarras
          titulo="Peças vendidas"
          formato="pecas"
          barras={noPeriodo.barras.map((b) => ({ chave: b.chave, rotulo: b.rotulo, valor: b.pecas }))}
        />
      </section>

      <section className={estilos.secaoArea} aria-labelledby="pecas">
        <h2 id="pecas">Suas peças</h2>
        <div className={estilos.saldos}>
          <div className={estilos.saldo}>
            <span>À venda</span>
            <strong>{contagem.aVenda}</strong>
          </div>
          <div className={estilos.saldo}>
            <span>Em cadastro na {loja.nomeCurto}</span>
            <strong>{contagem.emCadastro}</strong>
          </div>
          <div className={estilos.saldo}>
            <span>Vendidas</span>
            <strong>{contagem.vendidas}</strong>
          </div>
          {contagem.devolucao > 0 && (
            <div className={estilos.saldo}>
              <span>Devolução pedida</span>
              <strong>{contagem.devolucao}</strong>
            </div>
          )}
        </div>
        <p>
          <Link href="/fornecedora/pecas">Ver todas as peças</Link> · <Link href="/fornecedora/vendas">Ver todas as vendas</Link>
        </p>
      </section>
    </>
  );
}
