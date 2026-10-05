import Link from "next/link";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaFoto } from "@/lib/fotos";
import { CONSERVACOES } from "@/lib/pecas/dados";
import type { PrecoDaPromocao } from "@/lib/promocoes/regras";
import { enderecoDaPeca } from "@/lib/vitrine";
import { Estrela } from "./estrela";
import estilos from "./loja.module.css";

export type PecaDoCartao = {
  id: string;
  codigo: string;
  nome: string;
  tamanho: string | null;
  conservacao: string | null;
  marca: string | null;
  precoCentavos: number;
  fotos: { arquivo: string }[];
};

/** Campos que o cartão usa, para o `select` do Prisma. */
export const SELECAO_CARTAO = {
  id: true,
  codigo: true,
  nome: true,
  tamanho: true,
  conservacao: true,
  marca: true,
  precoCentavos: true,
  fotos: { orderBy: { ordem: "asc" as const }, take: 1, select: { arquivo: true } },
};

const nomeConservacao = (c: string | null) => CONSERVACOES.find((x) => x.valor === c)?.nome;

/** Peça na vitrine, nos favoritos e nas sugestões, com a estrela de favorito. */
export function CartaoPeca({
  peca,
  favorita,
  estrela,
  voltar,
  promocao,
}: {
  peca: PecaDoCartao;
  /** Preço da promoção que vale hoje, quando a peça está numa. */
  promocao?: PrecoDaPromocao | null;
  favorita: boolean;
  /** A estrela aparece para visitantes e clientes (não para quem está no painel). */
  estrela: boolean;
  voltar: string;
}) {
  return (
    <div className={estilos.comEstrela}>
      <Link href={enderecoDaPeca(peca.codigo)} className={estilos.cartao}>
        {peca.fotos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- fotos já reduzidas no envio
          <img src={enderecoDaFoto(peca.fotos[0].arquivo, true)} alt={peca.nome} loading="lazy" />
        ) : (
          <span className={estilos.semFoto}>Sem foto</span>
        )}
        {nomeConservacao(peca.conservacao) && (
          <span className={`sobretitulo ${estilos.sobreCartao}`}>{nomeConservacao(peca.conservacao)}</span>
        )}
        <span className={estilos.nome}>{peca.nome}</span>
        <span className={estilos.detalhe}>{[peca.tamanho && `Tam. ${peca.tamanho}`, peca.marca].filter(Boolean).join(" · ")}</span>
        {promocao ? (
          <span className={estilos.precoPromocao}>
            <s aria-label={`Antes ${formatarReais(peca.precoCentavos)}`}>{formatarReais(peca.precoCentavos)}</s>
            <strong className={estilos.preco}>{formatarReais(promocao.precoCentavos)}</strong>
          </span>
        ) : (
          <strong className={estilos.preco}>{formatarReais(peca.precoCentavos)}</strong>
        )}
      </Link>
      {estrela && <Estrela pecaId={peca.id} favorita={favorita} voltar={voltar} nome={peca.nome} />}
    </div>
  );
}
