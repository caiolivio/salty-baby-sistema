import { formatarData } from "../datas";
import { formatarReais } from "../dinheiro";
import { CONSERVACOES, GENEROS } from "../pecas/dados";
import { formatarTelefone } from "../pedidos/regras";
import { nomeDoStatus } from "../situacoes";
import { TAMANHOS } from "../tamanhos";

// Histórico de alterações (LGPD e controle da loja): quem mudou o quê, quando.
// Aqui ficam só as regras, sem banco, para poder testar.

export type TabelaDoHistorico = "peca" | "fornecedora" | "cliente";

/** Quem fez a mudança. `usuarioId` vazio = o próprio sistema ou alguém sem login. */
export type Autor = { usuarioId: string | null; nome: string };

export const AUTOR_SISTEMA: Autor = { usuarioId: null, nome: "Sistema (automático)" };

/** Quem está logado no painel ou na área (fornecedora, cliente). */
export const autorDe = (usuario: { id: string; nome: string }): Autor => ({ usuarioId: usuario.id, nome: usuario.nome });

/** Cliente que fechou o pedido no site, com ou sem conta. */
export const autorDoSite = (nome: string, usuarioId: string | null = null): Autor => ({
  usuarioId,
  nome: `${nome} (pelo site)`,
});

export type Mudanca = {
  campo: string;
  antes: string | null;
  depois: string | null;
  /** Só a administradora vê (dinheiro interno, CPF/CNPJ, Pix). */
  restrito: boolean;
};

type Valor = string | number | boolean | Date | null | undefined | readonly string[];

type Campo<T> = {
  titulo: string;
  ler: (registro: T) => Valor;
  mostrar?: (valor: NonNullable<Valor>) => string;
  restrito?: boolean;
  /** Dado pessoal: o histórico guarda só que mudou, nunca o valor. */
  oculto?: boolean;
};

const nomeDe = (lista: readonly { valor: string; nome: string }[]) => (v: NonNullable<Valor>) =>
  lista.find((o) => o.valor === v)?.nome ?? String(v);
const reais = (v: NonNullable<Valor>) => formatarReais(Number(v));
const pontosBase = (v: NonNullable<Valor>) => `${(Number(v) / 100).toLocaleString("pt-BR")}%`;
const simNao = (v: NonNullable<Valor>) => (v ? "Sim" : "Não");
const telefone = (v: NonNullable<Valor>) => formatarTelefone(String(v));

function comoTexto(valor: Valor, mostrar?: (v: NonNullable<Valor>) => string): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (Array.isArray(valor)) return valor.length ? [...valor].sort((a, b) => a.localeCompare(b, "pt-BR")).join(", ") : null;
  if (mostrar) return mostrar(valor as NonNullable<Valor>);
  if (valor instanceof Date) return formatarData(valor);
  return String(valor);
}

/** O que mudou entre dois estados do mesmo registro. */
export function comparar<T>(campos: readonly Campo<T>[], antes: T, depois: T): Mudanca[] {
  const mudancas: Mudanca[] = [];
  for (const campo of campos) {
    const a = comoTexto(campo.ler(antes), campo.mostrar);
    const d = comoTexto(campo.ler(depois), campo.mostrar);
    if (a === d) continue;
    mudancas.push(
      campo.oculto
        ? { campo: campo.titulo, antes: null, depois: d === null ? "(apagado)" : "(alterado)", restrito: true }
        : { campo: campo.titulo, antes: a, depois: d, restrito: Boolean(campo.restrito) },
    );
  }
  return mudancas;
}

// ---------------------------------------------------------------- peça

export type EstadoPeca = {
  nome: string;
  status: string;
  naoListada: boolean;
  precoCentavos: number;
  custoCentavos: number | null;
  percentualRepasse: number | null;
  quantidade: number;
  tamanho: string | null;
  genero: string | null;
  conservacao: string | null;
  nota: number | null;
  variacao: string | null;
  marca: string | null;
  cor: string | null;
  medidas: string | null;
  descricao: string | null;
  dataEntrada: Date;
  categorias: readonly string[];
};

/** Preço e status primeiro: são o que mais se procura no histórico. */
export const CAMPOS_PECA: readonly Campo<EstadoPeca>[] = [
  { titulo: "Status", ler: (p) => nomeDoStatus(p.status, p.naoListada) },
  { titulo: "Preço", ler: (p) => p.precoCentavos, mostrar: reais },
  { titulo: "Custo", ler: (p) => p.custoCentavos, mostrar: reais, restrito: true },
  { titulo: "% repasse", ler: (p) => p.percentualRepasse, mostrar: pontosBase, restrito: true },
  { titulo: "Quantidade", ler: (p) => p.quantidade },
  { titulo: "Nome", ler: (p) => p.nome },
  { titulo: "Categorias", ler: (p) => p.categorias },
  { titulo: "Tamanho", ler: (p) => p.tamanho, mostrar: nomeDe(TAMANHOS) },
  { titulo: "Gênero", ler: (p) => p.genero, mostrar: nomeDe(GENEROS) },
  { titulo: "Conservação", ler: (p) => p.conservacao, mostrar: nomeDe(CONSERVACOES) },
  { titulo: "Nota", ler: (p) => p.nota },
  { titulo: "Variação", ler: (p) => p.variacao },
  { titulo: "Marca", ler: (p) => p.marca },
  { titulo: "Cor", ler: (p) => p.cor },
  { titulo: "Medidas", ler: (p) => p.medidas },
  { titulo: "Descrição", ler: (p) => p.descricao },
  { titulo: "Data de entrada", ler: (p) => p.dataEntrada },
];

export const compararPeca = (antes: EstadoPeca, depois: EstadoPeca) => comparar(CAMPOS_PECA, antes, depois);

/** Só a troca de status (reserva, venda, devolução…), sem ler a peça inteira. */
export function mudancaDeStatus(
  antes: { status: string; naoListada?: boolean },
  depois: { status: string; naoListada?: boolean },
): Mudanca | null {
  const a = nomeDoStatus(antes.status, antes.naoListada);
  const d = nomeDoStatus(depois.status, depois.naoListada);
  return a === d ? null : { campo: "Status", antes: a, depois: d, restrito: false };
}

// ---------------------------------------------------------------- fornecedora e cliente

export type EstadoFornecedora = {
  nome: string;
  telefone: string | null;
  email: string | null;
  documento?: string | null;
  pix: string | null;
  endereco: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  percentualRepassePadrao?: number;
  ativa?: boolean;
};

export const CAMPOS_FORNECEDORA: readonly Campo<EstadoFornecedora>[] = [
  { titulo: "% repasse padrão", ler: (f) => f.percentualRepassePadrao, mostrar: pontosBase, restrito: true },
  { titulo: "Ativa", ler: (f) => f.ativa, mostrar: simNao },
  { titulo: "Nome", ler: (f) => f.nome },
  { titulo: "WhatsApp", ler: (f) => f.telefone, mostrar: telefone },
  { titulo: "E-mail", ler: (f) => f.email },
  { titulo: "CPF/CNPJ", ler: (f) => f.documento, oculto: true },
  { titulo: "Pix", ler: (f) => f.pix, oculto: true },
  { titulo: "Endereço", ler: (f) => f.endereco },
  { titulo: "CEP", ler: (f) => f.cep },
  { titulo: "Cidade", ler: (f) => f.cidade },
  { titulo: "Estado", ler: (f) => f.estado },
];

export type EstadoCliente = {
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf?: string | null;
  endereco?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  observacao?: string | null;
};

export const CAMPOS_CLIENTE: readonly Campo<EstadoCliente>[] = [
  { titulo: "Nome", ler: (c) => c.nome },
  { titulo: "WhatsApp", ler: (c) => c.telefone, mostrar: telefone },
  { titulo: "E-mail", ler: (c) => c.email },
  { titulo: "CPF", ler: (c) => c.cpf, oculto: true },
  { titulo: "Endereço", ler: (c) => c.endereco },
  { titulo: "CEP", ler: (c) => c.cep },
  { titulo: "Cidade", ler: (c) => c.cidade },
  { titulo: "Estado", ler: (c) => c.estado },
  { titulo: "Observação", ler: (c) => c.observacao },
];

/** Os campos que a pessoa não mandou ficam como estavam (ex.: a cliente não edita o CPF). */
export function compararParcial<T extends object>(campos: readonly Campo<T>[], antes: T, mudou: Partial<T>): Mudanca[] {
  return comparar(campos, antes, { ...antes, ...mudou });
}

// ---------------------------------------------------------------- tela

export const NOMES_TABELA: Record<TabelaDoHistorico, string> = {
  peca: "Peça",
  fornecedora: "Fornecedora",
  cliente: "Cliente",
};

/** "R$ 30,00 → R$ 25,00", "(vazio) → Azul". */
export function descreverMudanca(m: { campo: string; antes: string | null; depois: string | null }): string {
  if (m.antes === null && m.depois !== null && (m.campo === "Cadastro" || m.depois === "(alterado)" || m.depois === "(apagado)")) {
    return m.depois;
  }
  return `${m.antes ?? "(vazio)"} → ${m.depois ?? "(vazio)"}`;
}

/** Texto longo (descrição, observação) fica cortado no histórico. */
export function resumir(texto: string | null, limite = 300): string | null {
  if (texto === null || texto.length <= limite) return texto;
  return `${texto.slice(0, limite - 1)}…`;
}
