import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { formatarDataHora } from "@/lib/datas";
import { buscarHistorico, type FiltroDoHistorico } from "@/lib/historico/consultar";
import { descreverMudanca, NOMES_TABELA, type TabelaDoHistorico } from "@/lib/historico/regras";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { BotoesExportar } from "../exportar/botoes";

export const metadata: Metadata = { title: "Histórico" };

const POR_PAGINA = 100;
const CAMPOS_COMUNS = ["Status", "Preço", "Cadastro", "Exclusão", "% repasse", "Custo", "Quantidade", "% repasse padrão"];
const ENDERECOS: Record<string, string> = {
  peca: "/painel/pecas/",
  fornecedora: "/painel/fornecedoras/",
  cliente: "/painel/clientes/",
};
const ENDERECO_FIXO: Record<string, string> = { loja: "/painel/configuracoes" };

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const dia = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export default async function Historico({ searchParams }: PageProps<"/painel/historico">) {
  await exigirAcesso("painel-administracao", "/painel/historico");
  const p = await searchParams;
  const tabela = texto(p.tabela);
  const filtro: FiltroDoHistorico = {
    busca: texto(p.q) || undefined,
    tabela: tabela in NOMES_TABELA ? (tabela as TabelaDoHistorico) : undefined,
    campo: CAMPOS_COMUNS.includes(texto(p.campo)) ? texto(p.campo) : undefined,
    de: dia(texto(p.de)) || undefined,
    ate: dia(texto(p.ate)) || undefined,
  };
  const pagina = Math.max(1, Number(p.pagina) || 1);
  const { total, linhas } = await buscarHistorico(filtro, pagina, POR_PAGINA);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const parametros = Object.fromEntries(
    Object.entries({ q: filtro.busca, tabela: filtro.tabela, campo: filtro.campo, de: filtro.de, ate: filtro.ate }).filter(
      (par): par is [string, string] => Boolean(par[1]),
    ),
  );
  const link = (n: number) => `/painel/historico?${new URLSearchParams({ ...parametros, pagina: String(n) })}`;

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Histórico de alterações</h1>
        <BotoesExportar tabela="historico" />
      </div>
      <p>
        Quem mudou preço, status ou dados de peças, fornecedoras e clientes, e quando. Vendas, reservas e devoluções também
        aparecem aqui. CPF/CNPJ e Pix não são guardados: o histórico diz só que mudaram.
      </p>
      <form className={proprios.formulario} role="search" aria-label="Filtrar o histórico">
        <div className={proprios.grade}>
          <label className={proprios.campo}>
            Buscar
            <input name="q" defaultValue={filtro.busca} placeholder="Código da peça, nome ou quem mudou" />
          </label>
          <label className={proprios.campo}>
            Onde
            <select name="tabela" defaultValue={filtro.tabela ?? ""}>
              <option value="">Tudo</option>
              {Object.entries(NOMES_TABELA).map(([valor, nome]) => (
                <option key={valor} value={valor}>
                  {nome}s
                </option>
              ))}
            </select>
          </label>
          <label className={proprios.campo}>
            O que mudou
            <select name="campo" defaultValue={filtro.campo ?? ""}>
              <option value="">Qualquer coisa</option>
              {CAMPOS_COMUNS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={proprios.campo}>
            De
            <input type="date" name="de" defaultValue={filtro.de} />
          </label>
          <label className={proprios.campo}>
            Até
            <input type="date" name="ate" defaultValue={filtro.ate} />
          </label>
        </div>
        <div className={proprios.acoes}>
          <button type="submit" className={proprios.botao}>
            Filtrar
          </button>
          {Object.keys(parametros).length > 0 && <Link href="/painel/historico">Limpar filtros</Link>}
        </div>
      </form>
      <p>{total === 0 ? "Nenhuma alteração encontrada." : `${total} alteração(ões).`}</p>
      {linhas.length > 0 && (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Onde</th>
                <th>O que mudou</th>
                <th>Mudança</th>
                <th>Quem</th>
                <th>Por quê</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((a) => (
                <tr key={a.id}>
                  <td className={estilos.curta}>{formatarDataHora(a.criadoEm)}</td>
                  <td data-rotulo={NOMES_TABELA[a.tabela as TabelaDoHistorico] ?? a.tabela}>
                    {ENDERECO_FIXO[a.tabela] ? (
                      <Link href={ENDERECO_FIXO[a.tabela]}>{a.rotulo}</Link>
                    ) : ENDERECOS[a.tabela] ? (
                      <Link href={`${ENDERECOS[a.tabela]}${a.registroId}`}>{a.rotulo}</Link>
                    ) : (
                      a.rotulo
                    )}
                  </td>
                  <td data-rotulo="O que mudou">
                    <strong>{a.campo}</strong>
                  </td>
                  <td data-rotulo="Mudança">{descreverMudanca(a)}</td>
                  <td data-rotulo="Quem">{a.quem}</td>
                  <td data-rotulo="Por quê">{a.motivo ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {paginas > 1 && (
        <nav className={estilos.paginas} aria-label="Páginas">
          {pagina > 1 && <Link href={link(pagina - 1)}>← Mais novas</Link>}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && <Link href={link(pagina + 1)}>Mais antigas →</Link>}
        </nav>
      )}
    </>
  );
}
