import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { nomeDaFormaAcerto } from "@/lib/acertos/regras";
import type { AcertoCompleto } from "@/lib/acertos/gravar";
import estilos from "./comprovante-acerto.module.css";

/** Comprovante de repasse: o mesmo no painel e na área da fornecedora. */
export function ComprovanteAcerto({ acerto, loja, mostrarQuem = false }: { acerto: AcertoCompleto; loja: string; mostrarQuem?: boolean }) {
  const vendido = acerto.itens.reduce((s, i) => s + i.valorPagoCentavos, 0);
  return (
    <article className={estilos.comprovante} aria-label={`Comprovante de repasse nº ${acerto.numero}`}>
      <h2>
        {loja} · Comprovante de repasse nº {acerto.numero}
      </h2>
      {acerto.canceladoEm && (
        <p className={estilos.desfeito}>
          Pagamento desfeito em {formatarDataHora(acerto.canceladoEm)}
          {acerto.canceladoPor ? ` por ${acerto.canceladoPor}` : ""}. As vendas voltaram a ficar a pagar.
        </p>
      )}
      <div className={estilos.dados}>
        <div>
          <span>Fornecedora</span>
          {acerto.fornecedora.codigo} · {acerto.fornecedora.nome}
        </div>
        <div>
          <span>Pago em</span>
          {formatarData(acerto.data)}
        </div>
        <div>
          <span>Forma</span>
          {nomeDaFormaAcerto(acerto.forma)}
        </div>
        <div>
          <span>Total do repasse</span>
          <strong>{formatarReais(acerto.totalCentavos)}</strong>
        </div>
        {mostrarQuem && (
          <div>
            <span>Registrado por</span>
            {acerto.quem} em {formatarDataHora(acerto.criadoEm)}
          </div>
        )}
      </div>
      {acerto.observacao && <p>Obs.: {acerto.observacao}</p>}
      {acerto.itens.length > 0 && (
        <>
          <ul className={estilos.itens}>
            {acerto.itens.map((i) => (
              <li key={i.id}>
                <div>
                  <strong>{i.peca.codigo}</strong> · {i.peca.nome}
                  <br />
                  Vendida em {formatarData(i.venda.data)} por {formatarReais(i.valorPagoCentavos)}
                </div>
                <div className={estilos.numero}>
                  <span>Repasse</span>
                  {formatarReais(i.repasseCentavos)}
                </div>
              </li>
            ))}
          </ul>
          <p className={estilos.totais}>
            <span>
              {acerto.pecas} {acerto.pecas === 1 ? "peça" : "peças"} · total vendido {formatarReais(vendido)}
            </span>
            <strong>Repasse: {formatarReais(acerto.totalCentavos)}</strong>
          </p>
        </>
      )}
    </article>
  );
}
