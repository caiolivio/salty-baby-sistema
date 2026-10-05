// Quem pode entrar em cada área do sistema. Esta é a única fonte da verdade:
// páginas e ações do servidor consultam estas regras antes de mostrar ou
// alterar qualquer dado (o MySQL não tem controle de acesso por linha).

export const PERFIS = ["administradora", "ajudante", "cliente", "fornecedora"] as const;
export type Perfil = (typeof PERFIS)[number];

export type Area =
  /** Painel da loja: estoque, vendas, clientes. */
  | "painel"
  /** Partes do painel só da administradora: usuários, financeiro, configurações. */
  | "painel-administracao"
  | "area-cliente"
  | "area-fornecedora";

const QUEM_ACESSA: Record<Area, readonly Perfil[]> = {
  painel: ["administradora", "ajudante"],
  "painel-administracao": ["administradora"],
  "area-cliente": ["cliente"],
  "area-fornecedora": ["fornecedora"],
};

export function podeAcessar(perfis: readonly Perfil[], area: Area): boolean {
  return perfis.some((perfil) => QUEM_ACESSA[area].includes(perfil));
}

/** Para onde a pessoa vai depois de entrar, pelo perfil mais amplo que ela tem. */
export function destinoInicial(perfis: readonly Perfil[]): string {
  if (podeAcessar(perfis, "painel")) return "/painel";
  if (podeAcessar(perfis, "area-fornecedora")) return "/fornecedora";
  if (podeAcessar(perfis, "area-cliente")) return "/minha-conta";
  return "/";
}

/**
 * Aceita só endereços internos no "voltar para" do login, para que um link
 * malicioso não leve a pessoa a outro site depois de entrar.
 */
export function enderecoDeVoltaSeguro(voltar: unknown): string | undefined {
  if (typeof voltar !== "string") return undefined;
  if (!voltar.startsWith("/") || voltar.startsWith("//") || voltar.includes("\\")) return undefined;
  return voltar;
}

// ---------------------------------------------------------------- equipe (suporte)
//
// A administradora pode tudo. O suporte (perfil "ajudante" no banco) só usa as
// páginas que ela marcou em Painel > Equipe, cada uma com "Só ver" ou "Ver e
// alterar", e só faz as ações delicadas que ela liberou uma a uma.

export const PAGINAS = [
  { chave: "pecas", nome: "Peças", explica: "Estoque, cadastro, fotos, status e etiquetas." },
  { chave: "categorias", nome: "Categorias", explica: "A lista de categorias das peças." },
  { chave: "marketing", nome: "WhatsApp Marketing", explica: "Posts para os grupos e a lista de grupos." },
  { chave: "fornecedoras", nome: "Fornecedores", explica: "Cadastro das fornecedoras e links de primeiro acesso." },
  { chave: "candidaturas", nome: "Seja fornecedora", explica: "Inscrições de novas fornecedoras e peças propostas." },
  { chave: "devolucoes", nome: "Devoluções", explica: "Peças que as fornecedoras pediram de volta." },
  { chave: "pedidos", nome: "Pedidos", explica: "Pedidos do site, reservas e peças de cada pedido." },
  { chave: "clientes", nome: "Clientes", explica: "Cadastro, compras e crianças das clientes." },
  { chave: "vendas", nome: "Vendas", explica: "Lista de vendas e venda direta (WhatsApp, loja, Bag)." },
  { chave: "sacolinhas", nome: "Sacolinhas", explica: "Peças pagas guardadas na loja: avisos semanais, envio, retirada e doação." },
  { chave: "historico", nome: "Histórico", explica: "Quem mudou o quê no sistema." },
] as const;
export type Pagina = (typeof PAGINAS)[number]["chave"];
export type Nivel = "ver" | "alterar";

export const EXTRAS = [
  {
    chave: "valores",
    nome: "Ver custo, repasse e lucro",
    risco: "A pessoa vê quanto a loja paga, quanto cada fornecedora recebe e quanto a loja lucra em cada peça.",
  },
  {
    chave: "confirmar_pagamento",
    nome: "Confirmar pagamento de pedidos",
    risco:
      "Confirmar um pagamento que não entrou tira as peças da vitrine e gera repasse para a fornecedora. Só libere para quem confere o Pix ou o cartão.",
  },
  {
    chave: "excluir_peca",
    nome: "Excluir peças",
    risco: "A exclusão apaga a peça e as fotos de vez e não pode ser desfeita. Fica registrada no histórico.",
  },
  {
    chave: "backup",
    nome: "Backup e Google Drive",
    risco:
      "A cópia de segurança tem o banco inteiro, inclusive CPF, endereços e Pix de clientes e fornecedoras. A pessoa também pode desligar a cópia no Google Drive.",
  },
] as const;
export type Extra = (typeof EXTRAS)[number]["chave"];

/** O que alguém do painel pode fazer. A administradora tem tudo. */
export type Acesso = {
  administradora: boolean;
  paginas: Partial<Record<Pagina, Nivel>>;
  extras: readonly Extra[];
};

export const SEM_ACESSO: Acesso = { administradora: false, paginas: {}, extras: [] };

export function acessoDaEquipe(
  perfis: readonly Perfil[],
  permissoes: readonly { chave: string; nivel: string }[],
): Acesso {
  if (perfis.includes("administradora")) return { administradora: true, paginas: {}, extras: [] };
  if (!perfis.includes("ajudante")) return SEM_ACESSO;
  const paginas: Partial<Record<Pagina, Nivel>> = {};
  const extras: Extra[] = [];
  for (const p of permissoes) {
    if (ehPagina(p.chave) && (p.nivel === "ver" || p.nivel === "alterar")) paginas[p.chave] = p.nivel;
    else if (ehExtra(p.chave) && p.nivel === "sim") extras.push(p.chave);
  }
  return { administradora: false, paginas, extras };
}

export function ehPagina(chave: string): chave is Pagina {
  return PAGINAS.some((p) => p.chave === chave);
}

export function ehExtra(chave: string): chave is Extra {
  return EXTRAS.some((e) => e.chave === chave);
}

export function podeVer(acesso: Acesso, pagina: Pagina): boolean {
  return acesso.administradora || acesso.paginas[pagina] !== undefined;
}

export function podeAlterar(acesso: Acesso, pagina: Pagina): boolean {
  return acesso.administradora || acesso.paginas[pagina] === "alterar";
}

export function temExtra(acesso: Acesso, extra: Extra): boolean {
  return acesso.administradora || acesso.extras.includes(extra);
}

/** Primeira página que o suporte pode abrir (para onde vai depois de entrar). */
export function primeiraPagina(acesso: Acesso): string {
  if (acesso.administradora) return "/painel";
  const pagina = PAGINAS.find((p) => podeVer(acesso, p.chave));
  return pagina ? `/painel/${pagina.chave}` : "/painel";
}

/**
 * Lê as marcações do formulário de Equipe: "pagina:<chave>" = "ver" | "alterar"
 * e "extra:<chave>" = "sim". Qualquer outra coisa é ignorada.
 */
export function lerPermissoes(valores: Record<string, unknown>): { chave: string; nivel: string }[] {
  const lidas: { chave: string; nivel: string }[] = [];
  for (const p of PAGINAS) {
    const nivel = valores[`pagina:${p.chave}`];
    if (nivel === "ver" || nivel === "alterar") lidas.push({ chave: p.chave, nivel });
  }
  for (const e of EXTRAS) {
    if (valores[`extra:${e.chave}`] === "sim") lidas.push({ chave: e.chave, nivel: "sim" });
  }
  return lidas;
}

/** Resumo para a lista da Equipe e para o histórico: "Peças (alterar), Vendas (ver); excluir peças". */
export function resumoDoAcesso(acesso: Acesso): string {
  if (acesso.administradora) return "Tudo (administradora)";
  const paginas = PAGINAS.filter((p) => acesso.paginas[p.chave]).map(
    (p) => `${p.nome} (${acesso.paginas[p.chave] === "alterar" ? "ver e alterar" : "só ver"})`,
  );
  const extras = EXTRAS.filter((e) => acesso.extras.includes(e.chave)).map((e) => e.nome.toLowerCase());
  const partes = [paginas.join(", ") || "Nenhuma página"];
  if (extras.length) partes.push(`Também: ${extras.join("; ")}`);
  return partes.join(". ");
}
