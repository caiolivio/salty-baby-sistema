import { lerArquivoDeFoto } from "@/lib/fotos";

// Fotos das peças, lidas da pasta da VPS. Cada arquivo tem nome único e nunca
// muda, então o navegador pode guardá-lo por muito tempo.
export async function GET(_pedido: Request, { params }: RouteContext<"/fotos/[...caminho]">) {
  const { caminho } = await params;
  const conteudo = await lerArquivoDeFoto(caminho);
  if (!conteudo) return new Response("Foto não encontrada", { status: 404 });
  return new Response(new Uint8Array(conteudo), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
