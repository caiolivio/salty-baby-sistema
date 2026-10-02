import Link from "next/link";
import { CONSERVACOES, GENEROS } from "@/lib/pecas/dados";
import { enderecoDaFoto } from "@/lib/fotos";
import { TAMANHOS } from "@/lib/tamanhos";
import proprios from "../formulario.module.css";
import { receber, recusarPeca } from "./acoes";
import visual from "./candidaturas.module.css";

export type PropostaNoPainel = {
  id: string;
  descricao: string;
  foto: string;
  nome: string | null;
  tamanho: string | null;
  marca: string | null;
  genero: string | null;
  conservacao: string | null;
  situacao: "proposta" | "recusada" | "recebida";
  categoria: { nome: string } | null;
  peca: { id: string; codigo: string } | null;
};

const nomeDe = (lista: readonly { valor: string; nome: string }[], valor: string | null) =>
  valor ? (lista.find((o) => o.valor === valor)?.nome ?? valor) : null;

/** Peças que a candidata ou fornecedora mostrou, com o que a Salty fez com cada uma. */
export function PropostasNoPainel({
  propostas,
  podeReceber,
  voltar,
}: {
  propostas: PropostaNoPainel[];
  /** Só depois da parceria (a peça precisa do código da fornecedora). */
  podeReceber: boolean;
  voltar: string;
}) {
  if (propostas.length === 0) return <p>Nenhuma peça enviada.</p>;
  return (
    <ul className={visual.propostas}>
      {propostas.map((p) => {
        const detalhes = [
          p.categoria?.nome,
          nomeDe(TAMANHOS, p.tamanho),
          p.marca,
          nomeDe(GENEROS, p.genero),
          nomeDe(CONSERVACOES, p.conservacao),
        ].filter(Boolean);
        return (
          <li key={p.id} className={`${visual.proposta} ${p.situacao === "recusada" ? visual.recusada : ""}`}>
            <a href={enderecoDaFoto(p.foto)} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio */}
              <img src={enderecoDaFoto(p.foto, true)} alt={p.nome ?? "Foto da peça"} />
            </a>
            {p.nome && <strong>{p.nome}</strong>}
            <p>{p.descricao}</p>
            {detalhes.length > 0 && <p className={proprios.dica}>{detalhes.join(" · ")}</p>}
            {p.situacao === "recebida" && p.peca && (
              <span className={visual.selo}>
                Recebida: <Link href={`/painel/pecas/${p.peca.id}`}>{p.peca.codigo}</Link>
              </span>
            )}
            {p.situacao === "recusada" && <span className={visual.selo}>Não aceita</span>}
            {p.situacao === "proposta" && (
              <div className={proprios.acoes}>
                {podeReceber && (
                  <form action={receber}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="voltar" value={voltar} />
                    <button type="submit" className={proprios.botao}>
                      Recebi: cadastrar
                    </button>
                  </form>
                )}
                <form action={recusarPeca}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="voltar" value={voltar} />
                  <button type="submit" className={proprios.botaoSecundario}>
                    Não aceitar
                  </button>
                </form>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
