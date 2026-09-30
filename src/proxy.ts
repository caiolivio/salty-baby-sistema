import { NextResponse, type NextRequest } from "next/server";
import { enderecoNormalizado } from "@/lib/enderecos";

// Corrige endereços digitados com maiúscula ou acento (comum no celular), que
// antes davam "página não encontrada".
export function proxy(pedido: NextRequest) {
  const certo = enderecoNormalizado(pedido.nextUrl.pathname);
  if (!certo) return NextResponse.next();
  const destino = pedido.nextUrl.clone();
  destino.pathname = certo;
  return NextResponse.redirect(destino, 308);
}

export const config = {
  // Só páginas: fica de fora o que o próprio sistema gera (arquivos, fotos, api).
  matcher: ["/((?!_next/|api/|fotos/|.*\\.[a-zA-Z0-9]+$).*)"],
};
