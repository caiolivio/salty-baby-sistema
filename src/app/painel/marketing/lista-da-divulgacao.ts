import "server-only";
import { cookies } from "next/headers";
import { COOKIE_DIVULGACAO, LIMITE_DIVULGACAO } from "@/lib/grupos/regras";
import { lerCarrinho } from "@/lib/pedidos/regras";

// As peças escolhidas para a divulgação ficam num cookie do painel (mesmo
// formato do carrinho da loja) até a lista ser limpa.

export async function pecasDaDivulgacao(): Promise<string[]> {
  return lerCarrinho((await cookies()).get(COOKIE_DIVULGACAO)?.value).slice(0, LIMITE_DIVULGACAO);
}

export async function gravarDivulgacao(ids: string[]) {
  (await cookies()).set(COOKIE_DIVULGACAO, [...new Set(ids)].slice(0, LIMITE_DIVULGACAO).join(","), {
    path: "/painel",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}
