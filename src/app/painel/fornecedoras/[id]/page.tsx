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

export const metadata: Metadata = { title: "Fornecedora" };

const VENDIDAS = ["vendida", "na_sacolinha", "enviada", "retirada"] as const;

export default async function Fornecedora({ params, searchParams }: PageProps<"/painel/fornecedoras/[id]">) {
  const { id } = await params;
  const { acesso } = await exigirPagina("fornecedoras", "ver", `/painel/fornecedoras/${id}`);
  const valores = temExtra(acesso, "valores");
  const aviso = await searchParams;

  const fornecedora = await prisma.fornecedora.findUnique({
    where: { id },
    include: { usuario: { select: { email: true, ultimoAcessoEm: true } } },
  });
  if (!fornecedora) notFound();
  const [aVenda, vendidas] = await Promise.all([
    prisma.peca.count({ where: { fornecedoraId: id, quantidade: { gt: 0 }, status: { notIn: [...VENDIDAS] } } }),
    prisma.peca.count({ where: { fornecedoraId: id, status: { in: [...VENDIDAS] } } }),
  ]);
  const f = fornecedora;

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
                  acordo: "Ainda não aceitou o acordo.",
                  parabens: "Cadastro concluído.",
                  liberada: "Cadastro concluído.",
                }[etapaDaFornecedora(f)]
              }${f.termosAceitosEm ? ` Acordo aceito em ${formatarDataHora(f.termosAceitosEm)} (versão ${f.termosVersao}).` : ""}${
                f.usuario.ultimoAcessoEm ? ` Último acesso em ${formatarDataHora(f.usuario.ultimoAcessoEm)}.` : ""
              }`}
        </p>
        {f.ativa && acesso.administradora && <AcessoDaFornecedora id={f.id} temConta={Boolean(f.usuario)} />}
      </section>
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
