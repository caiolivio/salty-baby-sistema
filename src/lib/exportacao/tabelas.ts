import "server-only";
import { prisma } from "../banco";
import { nomeDaFormaAcerto } from "../acertos/regras";
import { NOMES_ETAPA } from "../fornecedoras/candidatura";
import { NOMES_TABELA, type TabelaDoHistorico } from "../historico/regras";
import { NOMES_QUEM_PAGA } from "../vendas/descontos";
import { CONSERVACOES, GENEROS } from "../pecas/dados";
import { formatarTelefone } from "../pedidos/regras";
import type { Pagina } from "../permissoes";
import { descontoDaPromocao, descricaoDoDesconto } from "../promocoes/regras";
import { nomeDoStatus } from "../situacoes";
import { TAMANHOS } from "../tamanhos";
import { CANAIS_DIRETOS, FORMAS_PAGAMENTO } from "../vendas/regras";
import type { Coluna } from "./planilha";

// O que cada tabela do painel exporta. CPF/CNPJ e Pix só vão para a
// administradora; custo, repasse e lucro, só para quem pode ver esses valores;
// quanto cada cliente gastou, só para quem vê Vendas.

type Exportacao = { colunas: Coluna<never>[]; linhas: unknown[] };

export type TabelaExportavel = {
  titulo: string;
  arquivo: string;
  /** Quem pode exportar: as mesmas pessoas que veem a lista no painel. */
  pagina: Pagina;
  /** Só a administradora baixa (pagamentos às fornecedoras, com Pix e valores). */
  soAdministradora?: boolean;
  carregar: (ver: Visao) => Promise<Exportacao>;
};

const nomeDe = (lista: readonly { valor: string; nome: string }[], valor: string | null | undefined) =>
  valor ? (lista.find((o) => o.valor === valor)?.nome ?? valor) : null;
const telefone = (t: string | null) => (t ? formatarTelefone(t) : null);
const canal = (c: string) => (c === "site" ? "Site" : nomeDe(CANAIS_DIRETOS, c));
const so = <T,>(pode: boolean, colunas: Coluna<T>[]) => (pode ? colunas : []);

/** Quais colunas protegidas a pessoa recebe. */
export type Visao = { documentos: boolean; valores: boolean; vendas: boolean };

function exportacao<T>(colunas: Coluna<T>[], linhas: T[]): Exportacao {
  return { colunas: colunas as Coluna<never>[], linhas };
}

async function pecas(ver: Visao) {
  const linhas = await prisma.peca.findMany({
    orderBy: { codigo: "asc" },
    include: {
      fornecedora: { select: { codigo: true, nome: true } },
      categorias: { select: { categoria: { select: { nome: true } } } },
    },
  });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Código", valor: (p) => p.codigo },
      { titulo: "Código antigo", valor: (p) => p.codigoAntigo },
      { titulo: "Nome", valor: (p) => p.nome },
      { titulo: "Status", valor: (p) => nomeDoStatus(p.status, p.naoListada) },
      { titulo: "Fornecedora", valor: (p) => (p.fornecedora ? `${p.fornecedora.codigo} · ${p.fornecedora.nome}` : "Peça da loja") },
      { titulo: "Categorias", valor: (p) => p.categorias.map((c) => c.categoria.nome).join(", ") },
      { titulo: "Tamanho", valor: (p) => nomeDe(TAMANHOS, p.tamanho) },
      { titulo: "Gênero", valor: (p) => nomeDe(GENEROS, p.genero) },
      { titulo: "Conservação", valor: (p) => nomeDe(CONSERVACOES, p.conservacao) },
      { titulo: "Nota", tipo: "numero", valor: (p) => p.nota },
      { titulo: "Marca", valor: (p) => p.marca },
      { titulo: "Cor", valor: (p) => p.cor },
      { titulo: "Variação", valor: (p) => p.variacao },
      { titulo: "Medidas", valor: (p) => p.medidas },
      { titulo: "Descrição", valor: (p) => p.descricao },
      { titulo: "Preço", tipo: "reais", valor: (p) => p.precoCentavos },
      { titulo: "Quantidade", tipo: "numero", valor: (p) => p.quantidade },
      ...so<L>(ver.valores, [
        { titulo: "Custo (peça da loja)", tipo: "reais", valor: (p) => p.custoCentavos },
        { titulo: "% repasse", tipo: "numero", valor: (p) => (p.percentualRepasse === null ? null : p.percentualRepasse / 100) },
      ]),
      { titulo: "Entrada", tipo: "data", valor: (p) => p.dataEntrada },
      { titulo: "Cadastrada em", tipo: "datahora", valor: (p) => p.criadoEm },
    ],
    linhas,
  );
}

async function fornecedoras(ver: Visao) {
  const linhas = await prisma.fornecedora.findMany({
    orderBy: { numero: "asc" },
    include: { usuario: { select: { email: true } } },
  });
  const repasses = await prisma.itemVenda.findMany({
    where: { peca: { fornecedoraId: { not: null } } },
    select: { repasseCentavos: true, repasseRecebido: true, peca: { select: { fornecedoraId: true } } },
  });
  const aReceber = new Map<string, number>();
  const acumulado = new Map<string, number>();
  for (const r of repasses) {
    const id = r.peca.fornecedoraId!;
    acumulado.set(id, (acumulado.get(id) ?? 0) + r.repasseCentavos);
    if (!r.repasseRecebido) aReceber.set(id, (aReceber.get(id) ?? 0) + r.repasseCentavos);
  }
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Código", valor: (f) => f.codigo },
      { titulo: "Nome", valor: (f) => f.nome },
      { titulo: "WhatsApp", valor: (f) => telefone(f.telefone) },
      { titulo: "E-mail", valor: (f) => f.email },
      // A chave Pix muitas vezes é o CPF, então segue a mesma regra.
      ...so<L>(ver.documentos, [
        { titulo: "CPF/CNPJ", valor: (f) => f.documento },
        { titulo: "Pix", valor: (f) => f.pix },
      ]),
      { titulo: "Endereço", valor: (f) => f.endereco },
      { titulo: "CEP", valor: (f) => f.cep },
      { titulo: "Cidade", valor: (f) => f.cidade },
      { titulo: "Estado", valor: (f) => f.estado },
      ...so<L>(ver.valores, [
        { titulo: "% repasse padrão", tipo: "numero", valor: (f) => f.percentualRepassePadrao / 100 },
      ]),
      { titulo: "Ativa", valor: (f) => f.ativa },
      { titulo: "Acesso ao site", valor: (f) => f.usuario?.email ?? null },
      { titulo: "Acordo aceito em", tipo: "datahora", valor: (f) => f.termosAceitosEm },
      ...so<L>(ver.valores, [
        { titulo: "A receber", tipo: "reais", valor: (f) => aReceber.get(f.id) ?? 0 },
        { titulo: "Acumulado", tipo: "reais", valor: (f) => acumulado.get(f.id) ?? 0 },
      ]),
    ],
    linhas,
  );
}

async function clientes(ver: Visao) {
  const linhas = await prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: { usuario: { select: { email: true } }, _count: { select: { vendas: true, criancas: true } } },
  });
  const somas = await prisma.venda.groupBy({ by: ["clienteId"], _sum: { totalCentavos: true }, _max: { data: true } });
  const porCliente = new Map(somas.map((s) => [s.clienteId, s]));
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Nome", valor: (c) => c.nome },
      { titulo: "WhatsApp", valor: (c) => telefone(c.telefone) },
      { titulo: "E-mail", valor: (c) => c.email },
      ...so<L>(ver.documentos, [{ titulo: "CPF", valor: (c) => c.cpf }]),
      { titulo: "Endereço", valor: (c) => c.endereco },
      { titulo: "CEP", valor: (c) => c.cep },
      { titulo: "Cidade", valor: (c) => c.cidade },
      { titulo: "Estado", valor: (c) => c.estado },
      { titulo: "Observação", valor: (c) => c.observacao },
      { titulo: "Conta no site", valor: (c) => c.usuario?.email ?? null },
      { titulo: "Crianças cadastradas", tipo: "numero", valor: (c) => c._count.criancas },
      { titulo: "Compras", tipo: "numero", valor: (c) => c._count.vendas },
      ...so<L>(ver.vendas, [
        { titulo: "Total comprado", tipo: "reais", valor: (c) => porCliente.get(c.id)?._sum.totalCentavos ?? 0 },
      ]),
      { titulo: "Última compra", tipo: "data", valor: (c) => porCliente.get(c.id)?._max.data ?? null },
      { titulo: "Cadastrada em", tipo: "datahora", valor: (c) => c.criadoEm },
    ],
    linhas,
  );
}

const NOMES_PEDIDO: Record<string, string> = { reservado: "Reservado", expirado: "Reserva vencida", cancelado: "Cancelado", pago: "Pago" };

async function pedidos() {
  const linhas = await prisma.pedido.findMany({
    orderBy: { numero: "desc" },
    include: {
      itens: { orderBy: { ordem: "asc" }, select: { peca: { select: { codigo: true } } } },
      grupo: { select: { nome: true } },
      cliente: { select: { nome: true } },
    },
  });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Número", tipo: "numero", valor: (p) => p.numero },
      { titulo: "Feito em", tipo: "datahora", valor: (p) => p.criadoEm },
      { titulo: "Status", valor: (p) => NOMES_PEDIDO[p.status] ?? p.status },
      { titulo: "Nome informado", valor: (p) => p.nomeCliente },
      { titulo: "WhatsApp", valor: (p) => telefone(p.telefoneCliente) },
      { titulo: "Cliente do cadastro", valor: (p) => p.cliente?.nome ?? null },
      { titulo: "Peças", tipo: "numero", valor: (p) => p.itens.length },
      { titulo: "Códigos", valor: (p) => p.itens.map((i) => i.peca.codigo).join(", ") },
      { titulo: "Total", tipo: "reais", valor: (p) => p.totalCentavos },
      { titulo: "Grupo de origem", valor: (p) => p.grupo?.nome ?? null },
    ],
    linhas,
  );
}

/** Uma linha por peça vendida, com repasse, desconto e lucro gravados na venda. */
async function vendas(ver: Visao) {
  const linhas = await prisma.itemVenda.findMany({
    orderBy: [{ venda: { data: "desc" } }, { venda: { criadoEm: "desc" } }],
    include: {
      venda: { include: { cliente: { select: { nome: true } }, pedido: { select: { numero: true } } } },
      peca: { select: { codigo: true, nome: true, tipo: true, fornecedora: { select: { codigo: true, nome: true } } } },
    },
  });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Data", tipo: "data", valor: (i) => i.venda.data },
      { titulo: "Pedido do site", tipo: "numero", valor: (i) => i.venda.pedido?.numero ?? null },
      { titulo: "Canal", valor: (i) => canal(i.venda.canal) },
      { titulo: "Grupo", valor: (i) => i.venda.grupo },
      { titulo: "Pagamento", valor: (i) => nomeDe(FORMAS_PAGAMENTO, i.venda.formaPagamento) },
      { titulo: "Cliente", valor: (i) => i.venda.cliente?.nome ?? null },
      { titulo: "Peça", valor: (i) => i.peca.codigo },
      { titulo: "Nome da peça", valor: (i) => i.peca.nome },
      { titulo: "Fornecedora", valor: (i) => (i.peca.fornecedora ? `${i.peca.fornecedora.codigo} · ${i.peca.fornecedora.nome}` : "Peça da loja") },
      { titulo: "Quantidade", tipo: "numero", valor: (i) => i.quantidade },
      { titulo: "Preço", tipo: "reais", valor: (i) => i.precoUnitarioCentavos },
      { titulo: "Desconto", tipo: "reais", valor: (i) => i.descontoCentavos },
      { titulo: "Desconto por conta", valor: (i) => (i.descontoPorConta ? NOMES_QUEM_PAGA[i.descontoPorConta] : null) },
      { titulo: "Motivo do desconto", valor: (i) => i.venda.motivoDesconto },
      { titulo: "Valor pago", tipo: "reais", valor: (i) => i.valorPagoCentavos },
      ...so<L>(ver.valores, [
        { titulo: "% repasse", tipo: "numero", valor: (i) => (i.percentualRepasse === null ? null : i.percentualRepasse / 100) },
        { titulo: "Repasse", tipo: "reais", valor: (i) => i.repasseCentavos },
        { titulo: "Custo", tipo: "reais", valor: (i) => i.custoCentavos },
        { titulo: "Lucro", tipo: "reais", valor: (i) => i.lucroCentavos },
        { titulo: "Repasse pago", valor: (i) => (i.peca.tipo === "loja" ? null : i.repasseRecebido) },
        { titulo: "Repasse pago em", tipo: "data", valor: (i) => i.repasseRecebidoEm },
      ]),
      { titulo: "Origem", valor: (i) => i.venda.origem },
    ],
    linhas,
  );
}

async function categorias() {
  const linhas = await prisma.categoria.findMany({ orderBy: { nome: "asc" }, include: { _count: { select: { pecas: true } } } });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Categoria", valor: (c) => c.nome },
      { titulo: "Ativa", valor: (c) => c.ativa },
      { titulo: "Peças", tipo: "numero", valor: (c) => c._count.pecas },
    ],
    linhas,
  );
}

async function candidaturas() {
  const linhas = await prisma.candidatura.findMany({
    orderBy: { criadoEm: "desc" },
    include: { fornecedora: { select: { codigo: true } }, _count: { select: { pecas: true } } },
  });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Inscrição em", tipo: "datahora", valor: (c) => c.criadoEm },
      { titulo: "Nome", valor: (c) => c.nome },
      { titulo: "WhatsApp", valor: (c) => telefone(c.telefone) },
      { titulo: "E-mail", valor: (c) => c.email },
      { titulo: "Endereço", valor: (c) => c.endereco },
      { titulo: "Cidade", valor: (c) => c.cidade },
      { titulo: "Estado", valor: (c) => c.estado },
      { titulo: "Etapa", valor: (c) => NOMES_ETAPA[c.etapa] ?? c.etapa },
      { titulo: "Fornecedora", valor: (c) => c.fornecedora?.codigo ?? null },
      { titulo: "Peças enviadas", tipo: "numero", valor: (c) => c._count.pecas },
      { titulo: "Acordo aceito em", tipo: "datahora", valor: (c) => c.acordoAceitoEm },
      { titulo: "Anotação", valor: (c) => c.observacao },
    ],
    linhas,
  );
}

const NOMES_DEVOLUCAO: Record<string, string> = { pedida: "Pedida", devolvida: "Devolvida", cancelada: "Cancelada" };

async function devolucoes() {
  const linhas = await prisma.devolucao.findMany({
    orderBy: { pedidaEm: "desc" },
    include: {
      peca: { select: { codigo: true, nome: true, dataEntrada: true } },
      fornecedora: { select: { codigo: true, nome: true } },
    },
  });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Pedida em", tipo: "datahora", valor: (d) => d.pedidaEm },
      { titulo: "Fornecedora", valor: (d) => `${d.fornecedora.codigo} · ${d.fornecedora.nome}` },
      { titulo: "Peça", valor: (d) => d.peca.codigo },
      { titulo: "Nome da peça", valor: (d) => d.peca.nome },
      { titulo: "Entrada da peça", tipo: "data", valor: (d) => d.peca.dataEntrada },
      { titulo: "Situação", valor: (d) => NOMES_DEVOLUCAO[d.situacao] ?? d.situacao },
      { titulo: "Concluída em", tipo: "datahora", valor: (d) => d.concluidaEm },
    ],
    linhas,
  );
}

async function acertos() {
  const linhas = await prisma.acerto.findMany({
    orderBy: [{ data: "desc" }, { numero: "desc" }],
    include: { fornecedora: { select: { codigo: true, nome: true } } },
  });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Nº", valor: (a) => a.numero },
      { titulo: "Pago em", tipo: "data", valor: (a) => a.data },
      { titulo: "Fornecedora", valor: (a) => `${a.fornecedora.codigo} · ${a.fornecedora.nome}` },
      { titulo: "Forma", valor: (a) => nomeDaFormaAcerto(a.forma) },
      { titulo: "Peças", valor: (a) => a.pecas },
      { titulo: "Total do repasse", tipo: "reais", valor: (a) => a.totalCentavos },
      { titulo: "Observação", valor: (a) => a.observacao },
      { titulo: "Registrado por", valor: (a) => a.quem },
      { titulo: "Registrado em", tipo: "datahora", valor: (a) => a.criadoEm },
      { titulo: "Desfeito em", tipo: "datahora", valor: (a) => a.canceladoEm },
    ],
    linhas,
  );
}

async function despesas() {
  const linhas = await prisma.despesa.findMany({ orderBy: [{ data: "desc" }, { criadoEm: "desc" }] });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Data", tipo: "data", valor: (d) => d.data },
      { titulo: "Despesa", valor: (d) => d.descricao },
      { titulo: "Categoria", valor: (d) => d.categoria },
      { titulo: "Valor", tipo: "reais", valor: (d) => d.valorCentavos },
      { titulo: "Lançada por", valor: (d) => d.quem },
      { titulo: "Lançada em", tipo: "datahora", valor: (d) => d.criadoEm },
    ],
    linhas,
  );
}

/** Uma linha por peça em cada promoção. */
async function promocoes() {
  const linhas = await prisma.promocaoPeca.findMany({
    orderBy: [{ promocao: { inicio: "desc" } }, { peca: { codigo: "asc" } }],
    select: { promocao: true, peca: { select: { codigo: true, nome: true, precoCentavos: true } } },
  });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Promoção", valor: (l) => l.promocao.nome },
      { titulo: "Desconto", valor: (l) => descricaoDoDesconto(l.promocao) },
      { titulo: "Início", tipo: "data", valor: (l) => l.promocao.inicio },
      { titulo: "Fim", tipo: "data", valor: (l) => l.promocao.fim },
      { titulo: "Quem paga", valor: (l) => (l.promocao.porContaDaLoja ? "Loja" : "Dividido com a fornecedora") },
      { titulo: "Ativa", valor: (l) => (l.promocao.ativa ? "Sim" : "Não") },
      { titulo: "Código da peça", valor: (l) => l.peca.codigo },
      { titulo: "Peça", valor: (l) => l.peca.nome },
      { titulo: "Preço", tipo: "reais", valor: (l) => l.peca.precoCentavos },
      { titulo: "Preço na promoção", tipo: "reais", valor: (l) => l.peca.precoCentavos - descontoDaPromocao(l.peca.precoCentavos, l.promocao) },
    ],
    linhas,
  );
}

async function historico(ver: Visao) {
  // As mais recentes primeiro; um limite alto evita um arquivo grande demais.
  const linhas = await prisma.alteracao.findMany({
    where: ver.valores ? {} : { restrito: false },
    orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
    take: 50_000,
  });
  type L = (typeof linhas)[number];
  return exportacao<L>(
    [
      { titulo: "Quando", tipo: "datahora", valor: (a) => a.criadoEm },
      { titulo: "Onde", valor: (a) => NOMES_TABELA[a.tabela as TabelaDoHistorico] ?? a.tabela },
      { titulo: "Registro", valor: (a) => a.rotulo },
      { titulo: "O que mudou", valor: (a) => a.campo },
      { titulo: "Antes", valor: (a) => a.antes },
      { titulo: "Depois", valor: (a) => a.depois },
      { titulo: "Quem", valor: (a) => a.quem },
      { titulo: "Por quê", valor: (a) => a.motivo },
    ],
    linhas,
  );
}

export const TABELAS: Record<string, TabelaExportavel> = {
  pecas: { titulo: "Peças", arquivo: "pecas", pagina: "pecas", carregar: pecas },
  fornecedoras: { titulo: "Fornecedoras", arquivo: "fornecedoras", pagina: "fornecedoras", carregar: fornecedoras },
  clientes: { titulo: "Clientes", arquivo: "clientes", pagina: "clientes", carregar: clientes },
  pedidos: { titulo: "Pedidos", arquivo: "pedidos", pagina: "pedidos", carregar: pedidos },
  vendas: { titulo: "Vendas", arquivo: "vendas", pagina: "vendas", carregar: vendas },
  categorias: { titulo: "Categorias", arquivo: "categorias", pagina: "categorias", carregar: categorias },
  candidaturas: { titulo: "Seja fornecedora", arquivo: "inscricoes-fornecedoras", pagina: "candidaturas", carregar: candidaturas },
  devolucoes: { titulo: "Devoluções", arquivo: "devolucoes", pagina: "devolucoes", carregar: devolucoes },
  historico: { titulo: "Histórico de alterações", arquivo: "historico", pagina: "historico", carregar: historico },
  despesas: { titulo: "Despesas", arquivo: "despesas", pagina: "vendas", soAdministradora: true, carregar: despesas },
  promocoes: { titulo: "Promoções", arquivo: "promocoes", pagina: "vendas", soAdministradora: true, carregar: promocoes },
  acertos: { titulo: "Pagamentos às fornecedoras", arquivo: "pagamentos-fornecedoras", pagina: "vendas", soAdministradora: true, carregar: acertos },
};
