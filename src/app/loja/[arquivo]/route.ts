import { lerImagemDaLoja } from "@/lib/fotos";
import { ICONE_PADRAO, LOGO_PADRAO } from "@/lib/loja/regras";
import { lerLoja } from "@/lib/loja/servidor";

// Logo e ícone enviados em /painel/configuracoes. Sem imagem própria, vai para
// os arquivos da pasta public/marca.
export async function GET(_pedido: Request, { params }: RouteContext<"/loja/[arquivo]">) {
  const { arquivo } = await params;
  const tipo = arquivo === "logo.png" ? "logo" : arquivo === "icone.png" ? "icone" : null;
  if (!tipo) return new Response("Não encontrado", { status: 404 });
  const loja = await lerLoja();
  const guardado = loja[tipo];
  const conteudo = guardado ? await lerImagemDaLoja(guardado) : null;
  if (!conteudo) return new Response(null, { status: 307, headers: { Location: tipo === "logo" ? LOGO_PADRAO : ICONE_PADRAO } });
  return new Response(new Uint8Array(conteudo), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
