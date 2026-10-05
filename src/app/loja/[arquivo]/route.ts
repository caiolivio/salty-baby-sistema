import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { lerImagemDaLoja } from "@/lib/fotos";
import { ICONE_PADRAO, LOGO_PADRAO } from "@/lib/loja/regras";
import { lerLoja } from "@/lib/loja/servidor";
import { iconeDoApp, ocupacaoDoIcone } from "@/lib/pwa/regras";

/** Ícone grande da marca (cauda de baleia), para o app quando a loja não enviou o dela. */
const ICONE_DO_APP_PADRAO = path.join(process.cwd(), "public", "marca", "icone-app.png");

// Ícones do app já gerados, por versão das configurações e arquivo.
const gerados = new Map<string, Buffer>();

async function iconeParaOApp(arquivo: string, guardado: string | null, versao: number): Promise<Buffer | null> {
  const icone = iconeDoApp(arquivo);
  if (!icone) return null;
  const chave = `${versao}:${arquivo}`;
  const pronto = gerados.get(chave);
  if (pronto) return pronto;
  const origem = (guardado ? await lerImagemDaLoja(guardado) : null) ?? (await readFile(ICONE_DO_APP_PADRAO));
  const desenho = Math.round(icone.lado * ocupacaoDoIcone(icone.recortavel));
  const margem = Math.floor((icone.lado - desenho) / 2);
  const png = await sharp(origem)
    .resize(desenho, desenho, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .extend({ top: margem, left: margem, bottom: icone.lado - desenho - margem, right: icone.lado - desenho - margem, background: "#ffffff" })
    .png()
    .toBuffer();
  gerados.set(chave, png);
  return png;
}

// Logo e ícone enviados em /painel/configuracoes. Sem imagem própria, vai para
// os arquivos da pasta public/marca. Os ícones do app (app-*.png) saem do ícone.
export async function GET(_pedido: Request, { params }: RouteContext<"/loja/[arquivo]">) {
  const { arquivo } = await params;
  const loja = await lerLoja();
  if (iconeDoApp(arquivo)) {
    const png = await iconeParaOApp(arquivo, loja.icone, loja.versao);
    if (!png) return new Response("Não encontrado", { status: 404 });
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
    });
  }
  const tipo = arquivo === "logo.png" ? "logo" : arquivo === "icone.png" ? "icone" : null;
  if (!tipo) return new Response("Não encontrado", { status: 404 });
  const guardado = loja[tipo];
  const conteudo = guardado ? await lerImagemDaLoja(guardado) : null;
  if (!conteudo) return new Response(null, { status: 307, headers: { Location: tipo === "logo" ? LOGO_PADRAO : ICONE_PADRAO } });
  return new Response(new Uint8Array(conteudo), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
