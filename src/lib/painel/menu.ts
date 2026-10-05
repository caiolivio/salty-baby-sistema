// Itens do menu do painel, na ordem combinada com o Caio (05/10/2026). Função
// pura, testada: cada pessoa vê só o que pode abrir (a página confere de novo).

import { PAGINAS_EDITAVEIS } from "../paginas/regras";
import { PAGINAS, podeVer, temExtra, type Acesso, type Pagina } from "../permissoes";

export type LinkDoMenu = { chave: string; nome: string };
/** Um link, ou um grupo com submenu (o grupo não tem página própria). */
export type ItemDoMenu = LinkDoMenu & { filhos?: LinkDoMenu[] };

const nomeDa = (chave: Pagina) => PAGINAS.find((p) => p.chave === chave)!.nome;

export function itensDoMenu(acesso: Acesso): ItemDoMenu[] {
  const admin = acesso.administradora;
  const pagina = (chave: Pagina): LinkDoMenu[] => (podeVer(acesso, chave) ? [{ chave, nome: nomeDa(chave) }] : []);
  const soAdmin = (chave: string, nome: string): LinkDoMenu[] => (admin ? [{ chave, nome }] : []);
  const grupo = (chave: string, nome: string, filhos: LinkDoMenu[]): ItemDoMenu[] => (filhos.length ? [{ chave, nome, filhos }] : []);

  return [
    { chave: "", nome: "Início" },
    ...grupo("financas", "Finanças", [
      ...soAdmin("financeiro", "Financeiro"),
      ...soAdmin("acertos", "Contas a pagar"),
      ...soAdmin("indicadores", "Indicadores"),
      ...soAdmin("relatorios", "Relatórios das fornecedoras"),
    ]),
    ...pagina("pecas"),
    ...pagina("categorias"),
    ...pagina("devolucoes"),
    ...pagina("pedidos"),
    ...pagina("vendas"),
    ...pagina("clientes"),
    ...pagina("sacolinhas"),
    ...soAdmin("promocoes", "Promoções"),
    ...soAdmin("cupons", "Cupons"),
    ...pagina("marketing"),
    ...pagina("fornecedoras"),
    ...pagina("candidaturas"),
    ...grupo(
      "paginas",
      "Páginas",
      PAGINAS_EDITAVEIS.flatMap((p) => soAdmin(`paginas/${p.chave}`, p.nome)),
    ),
    ...pagina("historico"),
    ...grupo("configuracao", "Configurações", [
      ...soAdmin("configuracoes", "Configurações da loja"),
      ...soAdmin("equipe", "Equipe"),
      ...(temExtra(acesso, "backup") ? [{ chave: "backup", nome: "Backup" }] : []),
      ...soAdmin("importar", "Importar do Notion"),
    ]),
  ];
}

/** O grupo da página aberta (para mostrar as abas do grupo no alto da página). */
export function grupoDaPagina(itens: readonly ItemDoMenu[], caminho: string): ItemDoMenu | undefined {
  return itens.find((i) => i.filhos?.some((f) => caminho === `/painel/${f.chave}` || caminho.startsWith(`/painel/${f.chave}/`)));
}
