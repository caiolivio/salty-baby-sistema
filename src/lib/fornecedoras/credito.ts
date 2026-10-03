import { lerReais } from "../importacao/notion";
import { formatarReais } from "../dinheiro";

// Compra com o saldo da fornecedora. Funções puras, testadas. Valores em centavos.
//
// O saldo para compras é o repasse que ela tem a receber (vendas ainda não
// pagas, menos o que já usou em compras) mais o bônus. Numa compra, o bônus
// é usado primeiro (ele só vale para compras); depois, o repasse. Quem usa
// todo o repasse a receber ganha 10% do valor usado como bônus. O repasse
// usado sai do próximo acerto (Contas a pagar).

/** Bônus de quem usa todo o saldo a receber: 10% (pontos-base). */
export const PERCENTUAL_BONUS = 1000;

export type Movimento = { repasseCentavos: number; bonusCentavos: number };

export type SaldoDeCredito = {
  /** Repasse das vendas não pagas, menos o já usado em compras. */
  aReceberCentavos: number;
  /** Repasse usado em compras que o próximo acerto ainda vai descontar. */
  usadoPendenteCentavos: number;
  bonusCentavos: number;
  /** O que ela pode gastar agora numa compra. */
  disponivelCentavos: number;
};

export function saldoDeCredito(repassePendenteCentavos: number, movimentos: readonly Movimento[]): SaldoDeCredito {
  const usado = Math.max(0, -movimentos.reduce((s, m) => s + m.repasseCentavos, 0));
  const bonus = Math.max(
    0,
    movimentos.reduce((s, m) => s + m.bonusCentavos, 0),
  );
  const aReceber = Math.max(0, repassePendenteCentavos - usado);
  return {
    aReceberCentavos: aReceber,
    usadoPendenteCentavos: usado,
    bonusCentavos: bonus,
    disponivelCentavos: aReceber + bonus,
  };
}

export type UsoDoCredito = {
  bonusUsadoCentavos: number;
  repasseUsadoCentavos: number;
  bonusGanhoCentavos: number;
};

/** Como um valor sai do saldo: primeiro o bônus, depois o repasse; e se ganha bônus. */
export function planoDeUso(saldo: SaldoDeCredito, valorCentavos: number): { ok: true; uso: UsoDoCredito } | { ok: false; erro: string } {
  if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) return { ok: false, erro: "Informe quanto sai do saldo." };
  if (valorCentavos > saldo.disponivelCentavos) {
    return {
      ok: false,
      erro: `O saldo disponível é ${formatarReais(saldo.disponivelCentavos)}.`,
    };
  }
  const bonusUsado = Math.min(saldo.bonusCentavos, valorCentavos);
  const repasseUsado = valorCentavos - bonusUsado;
  // Ganha o bônus só quem usa todo o repasse a receber (R$ 99 de R$ 100 não ganha).
  const usouTudo = repasseUsado > 0 && repasseUsado === saldo.aReceberCentavos;
  const bonusGanho = usouTudo ? Math.round((repasseUsado * PERCENTUAL_BONUS) / 10_000) : 0;
  return {
    ok: true,
    uso: {
      bonusUsadoCentavos: bonusUsado,
      repasseUsadoCentavos: repasseUsado,
      bonusGanhoCentavos: bonusGanho,
    },
  };
}

/** Quanto do acerto é descontado pelas compras: o usado, até o total das vendas pagas. */
export function abatimentoNoAcerto(usadoPendenteCentavos: number, totalCentavos: number): number {
  return Math.max(0, Math.min(usadoPendenteCentavos, totalCentavos));
}

export type PedidoDeCredito = {
  fornecedoraId: string;
  valorCentavos: number;
} | null;

/**
 * Lê os campos "Pagar com o saldo da fornecedora" da confirmação e da venda
 * direta: `credito_fornecedora` (id) e `credito_valor` (R$). Sem fornecedora,
 * a venda não usa saldo. O limite do saldo é conferido ao gravar.
 */
export function lerPedidoDeCredito(
  valores: Record<string, unknown>,
  fornecedoras: readonly { id: string }[],
): { ok: true; credito: PedidoDeCredito } | { ok: false; erro: string } {
  const id = typeof valores.credito_fornecedora === "string" ? valores.credito_fornecedora : "";
  if (!id) {
    if (valores.forma === "credito_fornecedora") return { ok: false, erro: "Escolha de qual fornecedora sai o saldo." };
    return { ok: true, credito: null };
  }
  if (!fornecedoras.some((f) => f.id === id)) return { ok: false, erro: "Fornecedora do saldo não encontrada." };
  let valor: number;
  try {
    valor = lerReais(typeof valores.credito_valor === "string" ? valores.credito_valor : "");
  } catch {
    return { ok: false, erro: "O valor do saldo não é válido." };
  }
  if (valor <= 0) return { ok: false, erro: "Informe quanto sai do saldo." };
  return { ok: true, credito: { fornecedoraId: id, valorCentavos: valor } };
}

/**
 * Forma gravada na venda: se o saldo pagou tudo, "Crédito da fornecedora";
 * senão, a forma escolhida para o resto (que não pode ser o próprio crédito).
 */
export function formaComCredito<F extends string>(
  forma: F | "credito_fornecedora",
  creditoCentavos: number,
  totalCentavos: number,
): { ok: true; forma: F | "credito_fornecedora" } | { ok: false; erro: string } {
  if (creditoCentavos > totalCentavos) {
    return {
      ok: false,
      erro: `O saldo usado (${formatarReais(creditoCentavos)}) é maior que o total da venda (${formatarReais(totalCentavos)}).`,
    };
  }
  if (creditoCentavos > 0 && creditoCentavos === totalCentavos) return { ok: true, forma: "credito_fornecedora" };
  if (forma === "credito_fornecedora") {
    return creditoCentavos > 0
      ? {
          ok: false,
          erro: `O saldo cobre ${formatarReais(creditoCentavos)}. Escolha como foram pagos os outros ${formatarReais(totalCentavos - creditoCentavos)}.`,
        }
      : { ok: false, erro: "Escolha de qual fornecedora sai o saldo." };
  }
  return { ok: true, forma };
}
