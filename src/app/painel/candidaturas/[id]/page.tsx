import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Passos } from "@/componentes/passos";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarDia, formatarDataHora } from "@/lib/datas";
import { NOMES_ETAPA, PASSOS, passoDaEtapa, situacaoDosPassos } from "@/lib/fornecedoras/candidatura";
import { formatarTelefone, lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { anotar, efetivar, recusar } from "../acoes";
import { Aprovar } from "../aprovar";
import visual from "../candidaturas.module.css";
import { PropostasNoPainel } from "../propostas";

export const metadata: Metadata = { title: "Inscrição de fornecedora · Salty Baby" };

const ERROS: Record<string, string> = {
  "sem-acordo": "Ela ainda não aceitou o acordo (passo 2).",
  "ja-efetivada": "Esta parceria já foi efetivada.",
  "nao-encontrada": "Esta inscrição ou peça não existe mais.",
  "sem-fornecedora": "Efetive a parceria antes de cadastrar as peças, porque o código da peça leva o da fornecedora.",
  "ja-avaliada": "Esta peça já foi avaliada.",
};

export default async function Candidatura({ params, searchParams }: PageProps<"/painel/candidaturas/[id]">) {
  const { id } = await params;
  await exigirAcesso("painel-administracao", `/painel/candidaturas/${id}`);
  const aviso = await searchParams;

  const c = await prisma.candidatura.findUnique({
    where: { id },
    include: {
      fornecedora: { select: { id: true, codigo: true, nome: true } },
      usuario: { select: { email: true, ultimoAcessoEm: true } },
    },
  });
  if (!c) notFound();
  const propostas = await prisma.pecaProposta.findMany({
    where: { OR: [{ candidaturaId: id }, ...(c.fornecedoraId ? [{ fornecedoraId: c.fornecedoraId }] : [])] },
    orderBy: { criadoEm: "asc" },
    include: { categoria: { select: { nome: true } }, peca: { select: { id: true, codigo: true } } },
  });
  const passo = passoDaEtapa(c.etapa);
  const tel = lerTelefoneCliente(c.telefone);
  const aberta = c.etapa !== "recusada" && c.etapa !== "efetivada";
  const voltar = `/painel/candidaturas/${id}`;
  const erro = typeof aviso.erro === "string" ? ERROS[aviso.erro] : undefined;

  return (
    <>
      <p>
        <Link href="/painel/candidaturas">← Seja fornecedora</Link>
      </p>
      <h1 className={estilos.titulo}>{c.nome}</h1>
      {c.etapa !== "recusada" && <Passos nomes={PASSOS} situacoes={situacaoDosPassos(passo.atual, passo.concluido)} />}
      {aviso.efetivada && (
        <p className={proprios.aviso} role="status">
          Parceria efetivada! Ela agora é a fornecedora {String(aviso.efetivada)} e, ao entrar, vê a página de parabéns.
        </p>
      )}
      {aviso.recusada && (
        <p className={proprios.aviso} role="status">
          Inscrição recusada.
        </p>
      )}
      {aviso.anotada && (
        <p className={proprios.aviso} role="status">
          Anotação salva.
        </p>
      )}
      {erro && (
        <p className={proprios.erro} role="alert">
          {erro}
        </p>
      )}

      <dl className={visual.dados}>
        <dt>Etapa</dt>
        <dd>
          {NOMES_ETAPA[c.etapa]}
          {c.fornecedora && (
            <>
              {" · "}
              <Link href={`/painel/fornecedoras/${c.fornecedora.id}`}>
                {c.fornecedora.codigo} · {c.fornecedora.nome}
              </Link>
            </>
          )}
        </dd>
        <dt>WhatsApp</dt>
        <dd>
          {tel ? (
            <a href={linkWhatsappCliente(tel)} target="_blank" rel="noopener noreferrer">
              {formatarTelefone(c.telefone)}
            </a>
          ) : (
            c.telefone
          )}
        </dd>
        <dt>E-mail</dt>
        <dd>{c.email}</dd>
        <dt>Endereço</dt>
        <dd>{[c.endereco, c.cidade, c.estado, c.cep].filter(Boolean).join(" · ")}</dd>
        <dt>Inscrição</dt>
        <dd>{formatarDia(c.criadoEm)}</dd>
        {c.acordoAceitoEm && (
          <>
            <dt>Acordo aceito</dt>
            <dd>
              {formatarDataHora(c.acordoAceitoEm)} (versão {c.acordoVersao})
            </dd>
          </>
        )}
        {c.usuario && (
          <>
            <dt>Último acesso</dt>
            <dd>{c.usuario.ultimoAcessoEm ? formatarDataHora(c.usuario.ultimoAcessoEm) : "ainda não entrou"}</dd>
          </>
        )}
      </dl>

      {aberta && (
        <section aria-labelledby="curadoria">
          <h2 id="curadoria">Curadoria</h2>
          {c.etapa === "enviada" && <p>Avalie as peças abaixo. Se aprovar, ela recebe o acesso para fazer o passo 2.</p>}
          {c.etapa === "aprovada" && <p>Aprovada. Ela está no passo 2: mostrando mais peças e lendo o acordo.</p>}
          {c.etapa === "acordo_aceito" && (
            <p>
              Ela aceitou o acordo. Combine com ela pelo WhatsApp e, quando estiver tudo certo, efetive a parceria: ela ganha o
              código de fornecedora e as peças recebidas entram no estoque com esse código.
            </p>
          )}
          <Aprovar id={c.id} jaAprovada={c.etapa !== "enviada"} />
          {c.etapa === "acordo_aceito" && (
            <form action={efetivar} className={proprios.acoes}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className={proprios.botao}>
                Efetivar parceria (criar fornecedora)
              </button>
            </form>
          )}
          <form action={recusar} className={proprios.formulario}>
            <input type="hidden" name="id" value={c.id} />
            <label className={proprios.campo}>
              Motivo (só o painel vê)
              <input name="observacao" maxLength={500} defaultValue={c.observacao ?? ""} />
            </label>
            <div className={proprios.acoes}>
              <button type="submit" className={proprios.botaoSecundario}>
                Recusar inscrição
              </button>
            </div>
          </form>
        </section>
      )}

      <section aria-labelledby="pecas">
        <h2 id="pecas">Peças enviadas ({propostas.length})</h2>
        {!c.fornecedoraId && propostas.some((p) => p.situacao === "proposta") && (
          <p className={proprios.dica}>Depois de efetivar a parceria, dá para cadastrar no estoque as peças que chegarem.</p>
        )}
        <PropostasNoPainel propostas={propostas} podeReceber={Boolean(c.fornecedoraId)} voltar={voltar} />
      </section>

      {!aberta && (
        <section aria-labelledby="anotacao">
          <h2 id="anotacao">Anotação</h2>
          <form action={anotar} className={proprios.formulario}>
            <input type="hidden" name="id" value={c.id} />
            <label className={proprios.campo}>
              Anotação (só o painel vê)
              <textarea name="observacao" rows={3} maxLength={2000} defaultValue={c.observacao ?? ""} />
            </label>
            <div className={proprios.acoes}>
              <button type="submit" className={proprios.botaoSecundario}>
                Salvar anotação
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
