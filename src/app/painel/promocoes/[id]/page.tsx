import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Voltar } from "@/componentes/voltar";
import { exigirAcesso } from "@/lib/acesso";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { descontoDaPromocao, descricaoDoDesconto, NOMES_SITUACAO, situacaoDaPromocao } from "@/lib/promocoes/regras";
import { lerPromocaoDoBanco } from "@/lib/promocoes/servidor";
import { nomeDoStatus } from "@/lib/situacoes";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { apagarPromocao, incluirNaPromocao, tirarDaPromocao } from "../acoes";
import { FormularioPromocao } from "../formulario-promocao";
import promo from "../promocoes.module.css";

export const metadata: Metadata = { title: "Promoção" };

const dataBr = (t: string) => t.split("-").reverse().join("/");

export default async function Promocao({ params, searchParams }: PageProps<"/painel/promocoes/[id]">) {
  const { id } = await params;
  await exigirAcesso("painel-administracao", `/painel/promocoes/${id}`);
  const p = await lerPromocaoDoBanco(id);
  if (!p) notFound();
  const busca = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const s = situacaoDaPromocao(p, hoje);
  const naoAchados = typeof busca.nao_achados === "string" ? busca.nao_achados : "";
  const incluidas = typeof busca.incluidas === "string" ? Number(busca.incluidas) : null;

  return (
    <>
      <Voltar href="/painel/promocoes">Promoções</Voltar>
      <h1 className={estilos.titulo}>{p.nome}</h1>
      <p>
        {descricaoDoDesconto(p)}, de {dataBr(p.inicio)} a {dataBr(p.fim)} · <strong>{NOMES_SITUACAO[s]}</strong>
      </p>
      {busca.salvo && <p className={proprios.aviso}>Promoção salva.</p>}
      {incluidas !== null && <p className={proprios.aviso}>{incluidas === 1 ? "1 peça incluída." : `${incluidas} peças incluídas.`}</p>}
      {naoAchados && <p className={proprios.erro}>Estes códigos não foram encontrados: {naoAchados}</p>}

      <FormularioPromocao
        hoje={hoje}
        iniciais={{
          id: p.id,
          nome: p.nome,
          tipo: p.tipo,
          valor: p.tipo === "reais" ? (p.valor / 100).toFixed(2).replace(".", ",") : String(p.valor / 100).replace(".", ","),
          inicio: p.inicio,
          fim: p.fim,
          quem: p.porContaDaLoja ? "loja" : "dividido",
          ativa: p.ativa ? "on" : "",
        }}
      />

      <h2 id="pecas">Peças na promoção ({p.pecas.length})</h2>
      <form action={incluirNaPromocao} className={promo.incluir}>
        <input type="hidden" name="id" value={p.id} />
        <label className={proprios.campo}>
          Incluir peças pelo código
          <textarea name="codigos" rows={2} required placeholder="F06-00001, F12-00003…" />
        </label>
        <button type="submit" className={proprios.botaoSecundario}>
          Incluir
        </button>
      </form>
      {p.pecas.length === 0 ? (
        <p>Nenhuma peça nesta promoção ainda.</p>
      ) : (
        <ul className={promo.pecas}>
          {p.pecas.map((peca) => {
            const desconto = descontoDaPromocao(peca.precoCentavos, p);
            return (
              <li key={peca.id}>
                {peca.fotos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- fotos já reduzidas no envio
                  <img src={enderecoDaFoto(peca.fotos[0].arquivo, true)} alt="" loading="lazy" />
                ) : (
                  <span className={promo.semFoto} />
                )}
                <span className={promo.dados}>
                  <Link href={`/painel/pecas/${peca.id}`}>{peca.codigo}</Link> {peca.nome}
                  {peca.tamanho && ` · ${peca.tamanho}`}
                  <small>
                    <s>{formatarReais(peca.precoCentavos)}</s> {formatarReais(peca.precoCentavos - desconto)} ·{" "}
                    {nomeDoStatus(peca.status, peca.naoListada)}
                  </small>
                </span>
                <form action={tirarDaPromocao}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="pecaId" value={peca.id} />
                  <button type="submit" className={proprios.botaoSecundario}>
                    Tirar
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <div className={proprios.zonaPerigo}>
        <form action={apagarPromocao}>
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" className={proprios.botaoPerigo}>
            Excluir promoção
          </button>
        </form>
        <p className={proprios.dica}>
          As vendas já feitas continuam com o desconto que tiveram. Para parar só por um tempo, desmarque “Promoção ativa”.
        </p>
      </div>
    </>
  );
}
