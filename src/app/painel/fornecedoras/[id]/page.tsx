import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPagina } from "@/lib/acesso";
import { temExtra } from "@/lib/permissoes";
import { prisma } from "@/lib/banco";
import { mostrarPercentual } from "@/lib/fornecedoras/dados";
import estilos from "../../painel.module.css";
import { salvarFornecedora } from "../acoes";
import proprios from "../../formulario.module.css";
import { FormularioFornecedora } from "../formulario-fornecedora";
import { AcessoDaFornecedora } from "../acesso-da-fornecedora";
import { formatarDataHora } from "@/lib/datas";
import { etapaDaFornecedora } from "@/lib/fornecedoras/conta";
import { HistoricoDoRegistro } from "../../historico/do-registro";
import { Voltar } from "@/componentes/voltar";
import { formatarCpf } from "@/lib/clientes/dados";
import { aceitesDaFornecedora } from "@/lib/fornecedoras/aceite";
import { nomeDaFormaRecebimento, nomeDoTipoPix } from "@/lib/fornecedoras/contrato";
import { lerLoja } from "@/lib/loja/servidor";
import { formatarTelefone } from "@/lib/pedidos/regras";

export const metadata: Metadata = { title: "Fornecedora" };

const VENDIDAS = ["vendida", "na_sacolinha", "enviada", "retirada"] as const;

export default async function Fornecedora({ params, searchParams }: PageProps<"/painel/fornecedoras/[id]">) {
  const { id } = await params;
  const { acesso } = await exigirPagina("fornecedoras", "ver", `/painel/fornecedoras/${id}`);
  const valores = temExtra(acesso, "valores");
  const aviso = await searchParams;

  const fornecedora = await prisma.fornecedora.findUnique({
    where: { id },
    include: { usuario: { select: { email: true, ultimoAcessoEm: true } }, candidatura: { select: { id: true } } },
  });
  if (!fornecedora) notFound();
  const [aVenda, vendidas] = await Promise.all([
    prisma.peca.count({ where: { fornecedoraId: id, quantidade: { gt: 0 }, status: { notIn: [...VENDIDAS] } } }),
    prisma.peca.count({ where: { fornecedoraId: id, status: { in: [...VENDIDAS] } } }),
  ]);
  const f = fornecedora;
  const [aceites, loja] = await Promise.all([
    acesso.administradora ? aceitesDaFornecedora(f.id, f.candidatura?.id ?? null) : Promise.resolve([]),
    lerLoja(),
  ]);

  return (
    <>
      <p>
        <Voltar href="/painel/fornecedoras">Fornecedoras</Voltar>
      </p>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>
          {f.codigo} · {f.nome}
          {!f.ativa && <span className={proprios.inativa}>inativa</span>}
        </h1>
      </div>
      {aviso.criada && (
        <p className={proprios.aviso} role="status">
          Fornecedora cadastrada com o código {f.codigo}.
        </p>
      )}
      {aviso.salva && (
        <p className={proprios.aviso} role="status">
          Alterações salvas.
        </p>
      )}
      <div className={proprios.resumo}>
        <Link href={`/painel/pecas?q=${f.codigo}`}>Ver as peças dela</Link>
        {f.ativa && <Link href={`/painel/pecas/nova?fornecedora=${f.id}`}>Cadastrar peça dela</Link>}
        <span>{aVenda} em estoque</span>
        <span>{vendidas} vendida(s)</span>
        {acesso.administradora && <Link href={`/painel/acertos/pagar/${f.id}`}>Pagar repasses</Link>}
      </div>
      <section aria-labelledby="acesso">
        <h2 id="acesso">Área da fornecedora</h2>
        <p>
          {!f.usuario
            ? "Ela ainda não tem acesso à área dela no site."
            : `Entra com o e-mail ${f.usuario.email}. ${
                {
                  dados: "Ainda não terminou o cadastro.",
                  acordo: "Ainda não aceitou o contrato.",
                  parabens: "Cadastro concluído.",
                  liberada: "Cadastro concluído.",
                }[etapaDaFornecedora(f)]
              }${f.termosAceitosEm ? ` Contrato aceito em ${formatarDataHora(f.termosAceitosEm)} (versão ${f.termosVersao}).` : ""}${
                f.usuario.ultimoAcessoEm ? ` Último acesso em ${formatarDataHora(f.usuario.ultimoAcessoEm)}.` : ""
              }`}
        </p>
        {f.usuario && acesso.administradora && (
          <p className={proprios.dica}>Ao salvar o nome ou o e-mail nos dados abaixo, a conta de entrada muda junto.</p>
        )}
        {f.ativa && acesso.administradora && <AcessoDaFornecedora id={f.id} temConta={Boolean(f.usuario)} />}
      </section>
      {acesso.administradora && aceites.length > 0 && (
        <section aria-labelledby="aceites">
          <h2 id="aceites">Aceites do contrato</h2>
          <p className={proprios.dica}>Provas de cada aceite: o texto exato que estava na tela, a hora e de onde ela aceitou.</p>
          <ul className={proprios.aceites}>
            {aceites.map((a) => (
              <li key={a.id}>
                <strong>
                  Versão {a.versao} · aceito em {formatarDataHora(a.aceitoEm)}
                </strong>
                <br />
                Abriu o contrato em {formatarDataHora(a.abertoEm)}
                {a.lidoAteOFimEm && `, chegou ao fim do texto em ${formatarDataHora(a.lidoAteOFimEm)}`}
                .
                <br />
                {a.nome} · CPF {formatarCpf(a.documento)} · {formatarTelefone(a.telefone)} · {a.email}
                <br />
                Prefere receber: {nomeDaFormaRecebimento(a.recebimentoPreferido, loja.nome)}
                {a.pix && ` · Pix (${nomeDoTipoPix(a.pixTipo) ?? "?"}) ${a.pix}`}
                <br />
                <span className={proprios.dica}>
                  IP {a.ip ?? "não informado"} · {a.navegador ?? "navegador não informado"} · código do texto (SHA-256) {a.hash}
                </span>
                <br />
                <Link href={`/painel/fornecedoras/${f.id}/contrato/${a.id}`}>Ver o texto aceito</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <FormularioFornecedora
        acao={salvarFornecedora}
        textoBotao="Salvar alterações"
        voltar="/painel/fornecedoras"
        mostrarRepasse={valores}
        mostrarDocumentos={acesso.administradora}
        iniciais={{
          id: f.id,
          nome: f.nome,
          telefone: f.telefone ?? "",
          email: f.email ?? "",
          // CPF/CNPJ e Pix nem chegam ao navegador de quem não é administradora.
          documento: acesso.administradora ? (f.documento ?? "") : "",
          pix: acesso.administradora ? (f.pix ?? "") : "",
          pixTipo: acesso.administradora ? (f.pixTipo ?? "") : "",
          recebimentoPreferido: acesso.administradora ? (f.recebimentoPreferido ?? "") : "",
          endereco: f.endereco ?? "",
          cep: f.cep ?? "",
          cidade: f.cidade ?? "",
          estado: f.estado ?? "",
          percentualRepassePadrao: valores ? mostrarPercentual(f.percentualRepassePadrao) : "",
          ativa: f.ativa,
        }}
      />
      <HistoricoDoRegistro tabela="fornecedora" registroId={id} verRestritos={valores} />
    </>
  );
}
