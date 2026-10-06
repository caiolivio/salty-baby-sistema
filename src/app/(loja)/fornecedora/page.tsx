import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Package, PiggyBank, ShoppingBag, Tag, TrendingUp, Wallet } from "lucide-react";
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
import { concluirBoasVindas } from "./acoes";
import { FormularioAceite } from "./formulario-aceite";
import { TextoDaPagina } from "@/componentes/texto-da-pagina";
import { formatarCpf } from "@/lib/clientes/dados";
import { aberturaDoContrato, contratoParaAceite, ultimoAceite } from "@/lib/fornecedoras/aceite";
import { conteudoGuardado, textoDoCheckbox } from "@/lib/fornecedoras/contrato";
import { blocosDoTexto } from "@/lib/paginas/regras";
import { ComoFuncionaAArea, TextoDoAcordo } from "./acordo-texto";
import { EscolherPeriodo } from "./escolher-periodo";
import { FormularioDados } from "./formulario-dados";
import { EnviarPecas } from "./propostas";
import { lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Área da fornecedora", robots: { index: false } };

type DadosParaAceite = {
  nome: string;
  email: string | null;
  telefone: string | null;
  documento: string | null;
  pix: string | null;
  pixTipo: string | null;
  recebimentoPreferido: string | null;
};

/** Passo 3: o contrato completo, com o texto exato que ela aceitou. */
async function ContratoAceito({ fornecedoraId, aceitoEm }: { fornecedoraId: string; aceitoEm: Date | null }) {
  const aceite = await ultimoAceite(fornecedoraId);
  return (
    <section className={estilos.secaoArea} aria-labelledby="contrato-completo">
      <h2 id="contrato-completo">O contrato completo</h2>
      {aceite ? (
        <>
          <p>
            Você aceitou a versão {aceite.versao} em {formatarDia(aceite.aceitoEm)}. Ele fica guardado em Meus dados.
          </p>
          <div className={`${estilos.acordo} ${estilos.contrato}`}>
            <TextoDaPagina blocos={blocosDoTexto(conteudoGuardado(aceite.texto))} nivel={3} />
          </div>
        </>
      ) : (
        <>
          {aceitoEm && <p>Você aceitou este contrato em {formatarDia(aceitoEm)}.</p>}
          <TextoDoAcordo />
        </>
      )}
    </section>
  );
}

/** O contrato com os dados e o aceite (CLAUDE.md, "contrato de consignação digital"). */
async function AceiteDoContrato({ usuarioId, dados }: { usuarioId: string; dados: DadosParaAceite }) {
  const [loja, contrato] = await Promise.all([lerLoja(), contratoParaAceite()]);
  const abertura = aberturaDoContrato(usuarioId, contrato.hash);
  return (
    <section className={estilos.secaoArea} aria-labelledby="contrato">
      <h2 id="contrato">{contrato.titulo}</h2>
      <p className={estilos.dica}>
        Versão {contrato.versao}. Leia com atenção: ao aceitar, guardamos a versão, a data e a hora do seu aceite.
      </p>
      <FormularioAceite
        contrato={<TextoDaPagina blocos={contrato.blocos} nivel={3} />}
        abertura={abertura}
        textoCheckbox={textoDoCheckbox(loja.nome)}
        nomeLoja={loja.nome}
        iniciais={{
          nome: dados.nome,
          documento: dados.documento ? formatarCpf(dados.documento) : "",
          telefone: dados.telefone ? formatarTelefone(dados.telefone) : "",
          email: dados.email ?? "",
          pix: dados.pix ?? "",
          pixTipo: dados.pixTipo ?? "",
          recebimento: dados.recebimentoPreferido ?? "",
        }}
      />
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
          <h1 className={estilos.tituloPagina}>Suas peças foram aprovadas!</h1>
          <Passos nomes={PASSOS} situacoes={situacaoDosPassos(2, true)} />
          <section className={estilos.explicacao}>
            <p>
              Você já aceitou o contrato de consignação. Agora <strong>a {loja.nomeCurto} entra em contato pelo WhatsApp</strong> para
              combinar a entrega das peças e finalizar a sua parceria.
            </p>
            <p>Enquanto isso, você pode continuar mandando peças.</p>
          </section>
          <EnviarPecas dono={dono} titulo="Mostrar mais peças" />
        </>
      );
    }
    // Etapa "aprovada": passo 2, só as peças. O contrato vem no passo 3, depois de a loja efetivar a parceria.
    return (
      <>
        <h1 className={estilos.tituloPagina}>Suas peças foram aprovadas!</h1>
        <Passos nomes={PASSOS} situacoes={situacaoDosPassos(2)} />
        <section className={estilos.explicacao}>
          <p>
            Agora é o <strong>passo 2</strong>: mostre mais peças que você quer deixar com a {loja.nomeCurto}, com os detalhes de cada
            uma.
          </p>
          <p>
            Depois, <strong>a {loja.nomeCurto} entra em contato pelo WhatsApp</strong> para combinar a entrega e finalizar a sua
            parceria. Aí você lê e aceita o contrato completo (passo 3).
          </p>
        </section>
        <EnviarPecas dono={dono} titulo="Mostrar mais peças" />
      </>
    );
  }

  const { fornecedora } = situacao;
  const etapa = etapaDaFornecedora(fornecedora);
  // Quem veio pelo "Seja uma fornecedora" segue os 3 passos da inscrição; quem
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

  if (etapa === "acordo" && fornecedora.boasVindasEm) {
    // Já usava a área: o acordo mudou e a loja pediu um novo aceite.
    return (
      <>
        <h1 className={estilos.tituloPagina}>O contrato de consignação mudou</h1>
        <section className={estilos.explicacao}>
          <p>
            A {loja.nomeCurto} atualizou as regras da consignação. Leia o texto novo e aceite para continuar usando a sua área.
          </p>
        </section>
        <AceiteDoContrato usuarioId={usuario.id} dados={fornecedora} />
      </>
    );
  }

  if (etapa === "acordo" && veioDaInscricao) {
    // Passo 3 da inscrição: a parceria foi efetivada e falta o contrato completo.
    return (
      <>
        <h1 className={estilos.tituloPagina}>Passo 3: leia e aceite o contrato</h1>
        <Passos nomes={PASSOS} situacoes={situacaoDosPassos(3)} />
        <section className={estilos.explicacao}>
          <p>
            A {loja.nomeCurto} finalizou o seu cadastro. Falta só ler o contrato completo de consignação, confirmar os seus dados e
            aceitar para virar parceira.
          </p>
        </section>
        <AceiteDoContrato usuarioId={usuario.id} dados={fornecedora} />
      </>
    );
  }

  if (etapa === "acordo") {
    return (
      <>
        <h1 className={estilos.tituloPagina}>Leia e aceite o contrato</h1>
        <Passos nomes={PASSOS_PRIMEIRO_ACESSO} situacoes={["feito", "atual", "pendente"]} />
        <section className={estilos.explicacao}>
          <p>Seus dados foram salvos. Falta só ler e aceitar as regras da consignação para liberar a sua área.</p>
        </section>
        <AceiteDoContrato usuarioId={usuario.id} dados={fornecedora} />
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
          <form action={concluirBoasVindas}>
            <button type="submit" className={estilos.botaoWhats}>
              Ir para a minha área
            </button>
          </form>
        </section>
        <ContratoAceito fornecedoraId={fornecedora.id} aceitoEm={fornecedora.termosAceitosEm} />
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
            <Wallet className="icone" aria-hidden />
            <span>Vendidas · total a receber</span>
            <strong>{formatarReais(credito.aReceberCentavos)}</strong>
            <span>
              Repasse das peças vendidas que ainda não foi pago
              {credito.usadoPendenteCentavos > 0 && `, já sem os ${formatarReais(credito.usadoPendenteCentavos)} usados em compras`}.
            </span>
          </div>
          <div className={estilos.saldo}>
            <ShoppingBag className="icone" aria-hidden />
            <span>Saldo para compras</span>
            <strong>{formatarReais(credito.disponivelCentavos)}</strong>
            <span>
              Para comprar na {loja.nomeCurto}
              {credito.bonusCentavos > 0 && `, com ${formatarReais(credito.bonusCentavos)} de bônus`}.
            </span>
          </div>
          <div className={estilos.saldo}>
            <Tag className="icone" aria-hidden />
            <span>À venda</span>
            <strong>{formatarReais(saldos.aVendaCentavos)}</strong>
            <span>
              Quanto você recebe se as {saldos.pecasAVenda} peça(s) à venda forem vendidas pelo preço de hoje.
            </span>
          </div>
          <div className={estilos.saldo}>
            <TrendingUp className="icone" aria-hidden />
            <span>Acumulado</span>
            <strong>{formatarReais(saldos.acumuladoCentavos)}</strong>
            <span>Tudo o que você já ganhou ({formatarReais(saldos.acumuladoCentavos - credito.aReceberCentavos)} já pago ou usado em compras).</span>
          </div>
        </div>
        <div className={estilos.bonus} role="note">
          <Gift className="icone" aria-hidden />
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
              <ShoppingBag className="icone" aria-hidden />
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
            <Package className="icone" aria-hidden />
            <span>Peças vendidas</span>
            <strong>{noPeriodo.pecas}</strong>
          </div>
          <div className={estilos.saldo}>
            <TrendingUp className="icone" aria-hidden />
            <span>Valor das vendas</span>
            <strong>{formatarReais(noPeriodo.vendidoCentavos)}</strong>
          </div>
          <div className={estilos.saldo}>
            <PiggyBank className="icone" aria-hidden />
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
