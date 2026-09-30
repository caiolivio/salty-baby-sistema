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
