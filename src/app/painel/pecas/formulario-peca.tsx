"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  apagarRascunho,
  gravarRascunho,
  lerRascunho,
  type Rascunho,
} from "@/componentes/rascunho-local";
import {
  camposDoFormulario,
  chaveDoRascunho,
  quandoFoiGuardado,
  rascunhoDiferente,
  rascunhoVencido,
  type CamposDoRascunho,
} from "@/lib/pecas/rascunho";
import { reduzirFotosDoFormulario } from "@/componentes/reduzir-foto";
import { FotosNovas, type FotoNova } from "./fotos-novas";
import {
  CONSERVACOES,
  FORNECEDORA_LOJA,
  GENEROS,
  NOTA_MAXIMA,
  NOTA_MINIMA,
  OPCAO_VENDER,
  SITUACOES_DO_CADASTRO,
} from "@/lib/pecas/dados";
import { TAMANHOS } from "@/lib/tamanhos";
import estilos from "../formulario.module.css";
import type { EstadoPeca } from "./acoes";
import { EscolherCategorias } from "./escolher-categorias";

const NOTAS = Array.from({ length: NOTA_MAXIMA - NOTA_MINIMA + 1 }, (_, i) =>
  String(NOTA_MINIMA + i),
);

type Acao = (estado: EstadoPeca, dados: FormData) => Promise<EstadoPeca>;

export type OpcaoFornecedora = {
  id: string;
  codigo: string;
  nome: string;
  repasse: string;
};

export type ValoresPeca = Partial<
  Record<
    | "id"
    | "fornecedoraId"
    | "nome"
    | "tamanho"
    | "genero"
    | "conservacao"
    | "nota"
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
  opcoesDeStatus = SITUACOES_DO_CADASTRO,
  avisoDoStatus,
  opcaoDaLoja = "Peça da própria loja",
  mostrarValores = true,
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
  /** Quem pode alterar Categorias cria uma nova direto daqui. */
  podeIncluirCategoria?: boolean;
  /** Custo e repasse: só para quem pode ver custo, repasse e lucro. */
  mostrarValores?: boolean;
  /** Status que dá para escolher (a peça reservada ou vendida tem outra lista: opcoesDeStatus). */
  opcoesDeStatus?: readonly { valor: string; nome: string }[];
  /** O que a troca de status faz, quando mexe em pedido, devolução ou venda. */
  avisoDoStatus?: string | null;
  /** Texto da opção "peça da loja" na lista de fornecedoras (nome e prefixo da loja). */
  opcaoDaLoja?: string;
}) {
  const [estado, despachar, enviando] = useActionState(acao, undefined);
  const [preparando, setPreparando] = useState(false);
  const [fotos, setFotos] = useState<FotoNova[]>([]);
  const marcadas = new Set(estado?.categorias ?? categoriasMarcadas);
  const v = (campo: keyof ValoresPeca) =>
    estado?.valores ? estado.valores[campo] : iniciais[campo];
  const [vendendo, setVendendo] = useState(v("status") === OPCAO_VENDER.valor);
  const [fornecedoraId, setFornecedoraId] = useState(v("fornecedoraId") ?? "");
  const escolhida = fornecedoras?.find((f) => f.id === fornecedoraId);
  const consignada = fornecedoraFixa
    ? fornecedoraFixa.consignada
    : fornecedoraId !== FORNECEDORA_LOJA;
  const novo = !iniciais.id;
  const ocupado = enviando || preparando;

  // Rascunho no aparelho: o que foi digitado (e as fotos) não se perde se a página fechar.
  const chave = chaveDoRascunho(iniciais.id);
  const formulario = useRef<HTMLFormElement>(null);
  const inicial = useRef<CamposDoRascunho | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [oferta, setOferta] = useState<(Rascunho & { quando: string }) | null>(
    null,
  );
  const [decidido, setDecidido] = useState(false);
  const [salvoEm, setSalvoEm] = useState<number | null>(null);
  const [sujo, setSujo] = useState(false);

  useEffect(() => {
    if (formulario.current)
      inicial.current = camposDoFormulario(new FormData(formulario.current));
    let ativo = true;
    lerRascunho(chave).then((r) => {
      if (!ativo) return;
      if (r && rascunhoVencido(r.salvoEm, Date.now()))
        void apagarRascunho(chave);
      else if (
        r &&
        inicial.current &&
        rascunhoDiferente(r.campos, inicial.current, r.fotos.length)
      )
        return setOferta({
          ...r,
          quando: quandoFoiGuardado(r.salvoEm, Date.now()),
        });
      setDecidido(true);
    });
    return () => {
      ativo = false;
    };
  }, [chave]);

  const guardar = useCallback(
    (lista: FotoNova[]) => {
      if (!decidido || !formulario.current) return;
      if (espera.current) clearTimeout(espera.current);
      const form = formulario.current;
      espera.current = setTimeout(() => {
        const campos = camposDoFormulario(new FormData(form));
        if (
          inicial.current &&
          !rascunhoDiferente(campos, inicial.current, lista.length)
        ) {
          void apagarRascunho(chave);
          setSalvoEm(null);
          setSujo(false);
          return;
        }
        const agora = Date.now();
        const fotosGuardadas = lista.map((f) => ({
          nome: f.arquivo.name,
          tipo: f.arquivo.type,
          dados: f.arquivo as Blob,
        }));
        void gravarRascunho(chave, {
          campos,
          fotos: fotosGuardadas,
          salvoEm: agora,
        }).then((ok) => {
          if (ok !== undefined) setSalvoEm(agora);
        });
        setSujo(true);
      }, 600);
    },
    [chave, decidido],
  );

  useEffect(() => guardar(fotos), [fotos, guardar]);

  function continuarRascunho(r: Rascunho) {
    const form = formulario.current;
    if (form) {
      for (const el of Array.from(form.elements)) {
        if (
          !(
            el instanceof HTMLInputElement ||
            el instanceof HTMLSelectElement ||
            el instanceof HTMLTextAreaElement
          )
        )
          continue;
        if (
          !el.name ||
          el.name === "id" ||
          (el instanceof HTMLInputElement &&
            (el.type === "file" || el.type === "hidden"))
        )
          continue;
        const valores = r.campos[el.name] ?? [];
        if (
          el instanceof HTMLInputElement &&
          (el.type === "checkbox" || el.type === "radio")
        )
          el.checked = valores.includes(el.value);
        else el.value = valores[0] ?? "";
      }
    }
    if (r.campos.fornecedoraId?.[0] !== undefined)
      setFornecedoraId(r.campos.fornecedoraId[0]);
    setVendendo(r.campos.status?.[0] === OPCAO_VENDER.valor);
    if (novo && r.fotos.length > 0) {
      setFotos(
        r.fotos.map((f, i) => {
          const arquivo = new File([f.dados], f.nome || `foto-${i + 1}.jpg`, {
            type: f.tipo || "image/jpeg",
          });
          return {
            chave: `rascunho-${i}-${Math.random()}`,
            arquivo,
            previa: URL.createObjectURL(arquivo),
          };
        }),
      );
    }
    setOferta(null);
    setDecidido(true);
    setSalvoEm(r.salvoEm);
    setSujo(true);
  }

  function descartarRascunho() {
    void apagarRascunho(chave);
    setOferta(null);
    setDecidido(true);
  }

  // Aviso antes de sair com o cadastro pela metade (menu do painel, voltar, fechar a aba).
  useEffect(() => {
    if (!sujo) return;
    const antesDeFechar = (e: BeforeUnloadEvent) => e.preventDefault();
    const aoClicar = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        e.defaultPrevented
      )
        return;
      if (link.href.split("#")[0] === location.href.split("#")[0]) return;
      if (
        !confirm(
          "O cadastro ainda não foi salvo. Ele fica guardado como rascunho neste aparelho. Sair mesmo assim?",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", antesDeFechar);
    document.addEventListener("click", aoClicar, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeFechar);
      document.removeEventListener("click", aoClicar, true);
    };
  }, [sujo]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (espera.current) clearTimeout(espera.current);
    setSujo(false);
    void apagarRascunho(chave);
    setPreparando(true);
    const formulario = new FormData(evento.currentTarget);
    for (const foto of fotos) formulario.append("fotos", foto.arquivo); // na ordem escolhida
    const dados = await reduzirFotosDoFormulario(formulario);
    setPreparando(false);
    startTransition(() => despachar(dados));
  }

  return (
    <form
      ref={formulario}
      onSubmit={enviar}
      onInput={() => guardar(fotos)}
      onChange={() => guardar(fotos)}
      className={estilos.formulario}
      key={JSON.stringify(estado?.valores ?? null)}
    >
      {oferta && (
        <div className={estilos.rascunho} role="status">
          <p>
            <strong>Você tem um cadastro não terminado</strong>, guardado neste
            aparelho {oferta.quando}
            {oferta.fotos.length > 0 &&
              ` (com ${oferta.fotos.length} ${oferta.fotos.length === 1 ? "foto" : "fotos"})`}
            . Continuar?
          </p>
          <div className={estilos.acoes}>
            <button
              type="button"
              className={estilos.botao}
              onClick={() => continuarRascunho(oferta)}
            >
              Continuar o cadastro
            </button>
            <button
              type="button"
              className={estilos.botaoSecundario}
              onClick={descartarRascunho}
            >
              Começar do zero
            </button>
          </div>
        </div>
      )}
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
              <select
                name="fornecedoraId"
                required
                value={fornecedoraId}
                onChange={(e) => setFornecedoraId(e.target.value)}
              >
                <option value="">Escolha…</option>
                <option value={FORNECEDORA_LOJA}>{opcaoDaLoja}</option>
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
            <input
              name="nome"
              required
              minLength={2}
              maxLength={160}
              defaultValue={v("nome")}
              placeholder="Macacão, Body, Vestido…"
            />
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
            Nota
            <select name="nota" defaultValue={v("nota") ?? ""}>
              <option value="">Sem nota</option>
              {NOTAS.map((n) => (
                <option key={n} value={n}>
                  {n}
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
            <input
              name="variacao"
              maxLength={80}
              defaultValue={v("variacao")}
            />
          </label>
          <label className={estilos.campo}>
            Medidas
            <input
              name="medidas"
              maxLength={160}
              defaultValue={v("medidas")}
              placeholder="Ex.: comprimento 40 cm"
            />
          </label>
        </div>
        <EscolherCategorias
          categorias={categorias}
          marcadas={marcadas}
          podeIncluir={podeIncluirCategoria}
        />
        <label className={estilos.campo}>
          Descrição
          <textarea
            name="descricao"
            maxLength={2000}
            defaultValue={v("descricao")}
          />
        </label>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend>Preço e estoque</legend>
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Preço (R$)
            <input
              name="precoCentavos"
              inputMode="decimal"
              defaultValue={v("precoCentavos")}
              placeholder="45,90"
            />
          </label>
          {!mostrarValores ? null : consignada ? (
            <label className={estilos.campo}>
              Repasse (%)
              <input
                name="percentualRepasse"
                inputMode="decimal"
                defaultValue={v("percentualRepasse")}
                placeholder={escolhida ? escolhida.repasse : "40"}
                key={fornecedoraId}
              />
              <span className={estilos.dica}>
                Vazio usa o repasse padrão da fornecedora.
              </span>
            </label>
          ) : (
            <label className={estilos.campo}>
              Custo (R$)
              <input
                name="custoCentavos"
                inputMode="decimal"
                defaultValue={v("custoCentavos")}
              />
              <span className={estilos.dica}>
                Quanto a loja pagou pela peça, para calcular o lucro.
              </span>
            </label>
          )}
          <label className={estilos.campo}>
            Quantidade
            <input
              name="quantidade"
              type="number"
              min={0}
              max={999}
              step={1}
              defaultValue={v("quantidade") ?? "1"}
            />
          </label>
          <label className={estilos.campo}>
            Status
            <select
              name="status"
              defaultValue={v("status") ?? "rascunho"}
              onChange={(e) =>
                setVendendo(e.target.value === OPCAO_VENDER.valor)
              }
            >
              {opcoesDeStatus.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.nome}
                </option>
              ))}
            </select>
            {vendendo ? (
              <span className={estilos.dica}>
                Ao salvar, abre a venda com esta peça para você informar o valor
                pago, a forma de pagamento e o canal. Assim o repasse e o lucro
                ficam certos. Não use &quot;Baixa&quot; para peça vendida.
              </span>
            ) : (
              avisoDoStatus && (
                <span className={estilos.dica}>{avisoDoStatus}</span>
              )
            )}
          </label>
          <label className={estilos.campo}>
            Data de entrada
            <input
              name="dataEntrada"
              type="date"
              defaultValue={v("dataEntrada")}
            />
          </label>
        </div>
      </fieldset>

      {novo && <FotosNovas fotos={fotos} mudar={setFotos} />}

      <div className={estilos.acoes}>
        <button className={estilos.botao} type="submit" disabled={ocupado}>
          {preparando
            ? "Preparando fotos…"
            : enviando
              ? "Salvando…"
              : textoBotao}
        </button>
        <Link href={voltar}>Cancelar</Link>
        {salvoEm && (
          <span className={estilos.dica}>
            Rascunho guardado neste aparelho{" "}
            {quandoFoiGuardado(salvoEm, salvoEm)}
          </span>
        )}
      </div>
    </form>
  );
}
