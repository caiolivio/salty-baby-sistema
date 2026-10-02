import { usuarioAtual } from "@/lib/acesso";
import { lerArquivoDeFoto } from "@/lib/fotos";
import { podeAcessar } from "@/lib/permissoes";

// Fotos das peças, lidas da pasta da VPS. Cada arquivo tem nome único e nunca
// muda, então o navegador pode guardá-lo por muito tempo.
// As fotos de peças propostas (seja uma fornecedora) não são públicas: só a
// loja e as fornecedoras logadas veem.
export async function GET(_pedido: Request, { params }: RouteContext<"/fotos/[...caminho]">) {
  const { caminho } = await params;
  const privada = caminho[0] === "propostas";
  if (privada) {
    const usuario = await usuarioAtual();
    if (!usuario || !(podeAcessar(usuario.perfis, "painel") || podeAcessar(usuario.perfis, "area-fornecedora"))) {
      return new Response("Foto não encontrada", { status: 404 });
    }
  }
  const conteudo = await lerArquivoDeFoto(caminho);
  if (!conteudo) return new Response("Foto não encontrada", { status: 404 });
  return new Response(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": privada ? "private, max-age=86400" : "public, max-age=31536000, immutable",
    },
  });
}
