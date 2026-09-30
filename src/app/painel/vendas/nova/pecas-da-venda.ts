import "server-only";
import { cookies } from "next/headers";
import { lerCarrinho } from "@/lib/pedidos/regras";

// As peças escolhidas para a venda direta ficam num cookie da administradora
// até a venda ser registrada (mesmo formato do carrinho da loja).
const COOKIE_VENDA = "venda_painel";

export async function pecasDaVenda(): Promise<string[]> {
  return lerCarrinho((await cookies()).get(COOKIE_VENDA)?.value);
}

export async function gravarPecas(ids: string[]) {
  (await cookies()).set(COOKIE_VENDA, ids.join(","), {
    path: "/painel",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });
}
