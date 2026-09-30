"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { reduzirFotosDoFormulario } from "@/componentes/reduzir-foto";
import { FotosNovas, type FotoNova } from "./fotos-novas";
import { CONSERVACOES, FORNECEDORA_LOJA, GENEROS, SITUACOES_DO_CADASTRO } from "@/lib/pecas/dados";
import { TAMANHOS } from "@/lib/tamanhos";
import estilos from "../formulario.module.css";
import type { EstadoPeca } from "./acoes";
import { EscolherCategorias } from "./escolher-categorias";

type Acao = (estado: EstadoPeca, dados: FormData) => Promise<EstadoPeca>;

export type OpcaoFornecedora = { id: string; codigo: string; nome: string; repasse: string };

export type ValoresPeca = Partial<
  Record<
    | "id"
    | "fornecedoraId"
    | "nome"
    | "tamanho"
    | "genero"
    | "conservacao"
    | "variacao"
    | "marca"
    | "cor"
    | "medidas"
    | "descricao"
    | "precoCentavos"
    | "custoCentavos"
    | "percentualRepasse"
    | "quantidade"
    | "status"
    | "dataEntrada",
    string
  >
>;

export function FormularioPeca({
  acao,
  iniciais,
  textoBotao,
  voltar,
  fornecedoras,
  fornecedoraFixa,
  categorias,
  categoriasMarcadas = [],
  podeIncluirCategoria = false,
  situacaoFixa,
}: {
  acao: Acao;
  iniciais: ValoresPeca;
  textoBotao: string;
  voltar: string;
  /** Na peça nova: lista para escolher. */
  fornecedoras?: OpcaoFornecedora[];
  /** Na edição: a fornecedora não muda (o código da peça leva o dela). */
  fornecedoraFixa?: { texto: string; consignada: boolean };
  /** Categorias para marcar e as que já estão marcadas. */
  categorias: { id: string; nome: string }[];
  categoriasMarcadas?: string[];
  /** Só a administradora cria categorias. */
  podeIncluirCategoria?: boolean;
  /** Peça vendida: a situação só muda pelas vendas. */
  situacaoFixa?: string;
}) {
  const [estado, despachar, enviando] = useActionState(acao, undefined);
  const [preparando, setPreparando] = useState(false);
  const [fotos, setFotos] = useState<FotoNova[]>([]);
  const marcadas = new Set(estado?.categorias ?? categoriasMarcadas);
  const v = (campo: keyof ValoresPeca) => (estado?.valores ? estado.valores[campo] : iniciais[campo]);
  const [fornecedoraId, setFornecedoraId] = useState(v("fornecedoraId") ?? "");
  const escolhida = fornecedoras?.find((f) => f.id === fornecedoraId);
  const consignada = fornecedoraFixa ? fornecedoraFixa.consignada : fornecedoraId !== FORNECEDORA_LOJA;
  const novo = !iniciais.id;
  const ocupado = enviando || preparando;

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPreparando(true);
    const formulario = new FormData(evento.currentTarget);
    for (const foto of fotos) formulario.append("fotos", foto.arquivo); // na ordem escolhida
    const dados = await reduzirFotosDoFormulario(formulario);
    setPreparando(false);
    startTransition(() => despachar(dados));
  }

  return (
    <form onSubmit={enviar} className={estilos.formulario} key={JSON.stringify(estado?.valores ?? null)}>
      {estado?.erro && (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}
      {!novo && <input type="hidden" name="id" value={iniciais.id} />}

      <fieldset className={estilos.grupo}>
        <legend>Peça</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Fornecedora
            {fornecedoraFixa ? (
              <span className={estilos.fixo}>{fornecedoraFixa.texto}</span>
            ) : (
              <select name="fornecedoraId" required value={fornecedoraId} onChange={(e) => setFornecedoraId(e.target.value)}>
                <option value="">Escolha…</option>
                <option value={FORNECEDORA_LOJA}>Salty (peça da loja, código SB)</option>
                {fornecedoras?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.codigo} · {f.nome}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className={estilos.campo}>
            Nome da peça
            <input name="nome" required minLength={2} maxLength={160} defaultValue={v("nome")} placeholder="Macacão, Body, Vestido…" />
          </label>
          <label className={estilos.campo}>
            Tamanho
            <select name="tamanho" defaultValue={v("tamanho") ?? ""}>
              <option value="">Sem tamanho</option>
              {TAMANHOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            Gênero
            <select name="genero" defaultValue={v("genero") ?? ""}>
              <option value="">Escolha…</option>
              {GENEROS.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            Conservação
            <select name="conservacao" defaultValue={v("conservacao") ?? ""}>
              <option value="">Escolha…</option>
              {CONSERVACOES.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            Marca
            <input name="marca" maxLength={80} defaultValue={v("marca")} />
          </label>
          <label className={estilos.campo}>
            Cor
            <input name="cor" maxLength={80} defaultValue={v("cor")} />
          </label>
          <label className={estilos.campo}>
            Variação
            <input name="variacao" maxLength={80} defaultValue={v("variacao")} />
          </label>
          <label className={estilos.campo}>
            Medidas
            <input name="medidas" maxLength={160} defaultValue={v("medidas")} placeholder="Ex.: comprimento 40 cm" />
          </label>
        </div>
        <EscolherCategorias categorias={categorias} marcadas={marcadas} podeIncluir={podeIncluirCategoria} />
        <label className={estilos.campo}>
          Descrição
          <textarea name="descricao" maxLength={2000} defaultValue={v("descricao")} />
        </label>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend>Preço e estoque</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Preço (R$)
            <input name="precoCentavos" inputMode="decimal" defaultValue={v("precoCentavos")} placeholder="45,90" />
          </label>
          {consignada ? (
            <label className={estilos.campo}>
              Repasse (%)
              <input
                name="percentualRepasse"
                inputMode="decimal"
                defaultValue={v("percentualRepasse")}
                placeholder={escolhida ? escolhida.repasse : "40"}
                key={fornecedoraId}
              />
              <span className={estilos.dica}>Vazio usa o repasse padrão da fornecedora.</span>
            </label>
          ) : (
            <label className={estilos.campo}>
              Custo (R$)
              <input name="custoCentavos" inputMode="decimal" defaultValue={v("custoCentavos")} />
              <span className={estilos.dica}>Quanto a loja pagou pela peça, para calcular o lucro.</span>
            </label>
          )}
          <label className={estilos.campo}>
            Quantidade
            <input name="quantidade" type="number" min={0} max={999} step={1} defaultValue={v("quantidade") ?? "1"} />
          </label>
          <label className={estilos.campo}>
            Situação
            {situacaoFixa ? (
              <span className={estilos.fixo}>{situacaoFixa} (muda pelas vendas)</span>
            ) : (
              <select name="status" defaultValue={v("status") ?? "rascunho"}>
                {SITUACOES_DO_CADASTRO.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.nome}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className={estilos.campo}>
            Data de entrada
            <input name="dataEntrada" type="date" defaultValue={v("dataEntrada")} />
          </label>
        </div>
      </fieldset>

      {novo && <FotosNovas fotos={fotos} mudar={setFotos} />}

      <div className={estilos.acoes}>
        <button className={estilos.botao} type="submit" disabled={ocupado}>
          {preparando ? "Preparando fotos…" : enviando ? "Salvando…" : textoBotao}
        </button>
        <Link href={voltar}>Cancelar</Link>
      </div>
    </form>
  );
}
