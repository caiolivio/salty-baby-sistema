import { NextResponse, type NextRequest } from "next/server";
import { enderecoNormalizado } from "@/lib/enderecos";
import { COOKIE_GRUPO, lerCodigoGrupo, PARAMETRO_GRUPO } from "@/lib/grupos/regras";

// Corrige endereços digitados com maiúscula ou acento (comum no celular), que
// antes davam "página não encontrada". Também guarda o grupo de WhatsApp de
// onde a cliente veio (link do post com ?g=...), para o pedido contar para ele.
export function proxy(pedido: NextRequest) {
  const certo = enderecoNormalizado(pedido.nextUrl.pathname);
  let resposta: NextResponse;
  if (certo) {
    const destino = pedido.nextUrl.clone();
    destino.pathname = certo;
    resposta = NextResponse.redirect(destino, 308);
  } else {
    resposta = NextResponse.next();
  }
  const grupo = lerCodigoGrupo(pedido.nextUrl.searchParams.get(PARAMETRO_GRUPO));
  if (grupo && !pedido.nextUrl.pathname.startsWith("/painel")) {
    resposta.cookies.set(COOKIE_GRUPO, grupo, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return resposta;
}

export const config = {
  // Só páginas: fica de fora o que o próprio sistema gera (arquivos, fotos, api).
  matcher: ["/((?!_next/|api/|fotos/|.*\\.[a-zA-Z0-9]+$).*)"],
};
