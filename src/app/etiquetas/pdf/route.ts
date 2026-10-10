import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaEtiqueta, lerIds, origemDaRequisicao } from "@/lib/etiquetas";
import { pdfDasEtiquetas } from "@/lib/etiquetas-pdf";
import { lerImagemDaLoja } from "@/lib/fotos";
import { LOGO_PADRAO } from "@/lib/loja/regras";
import { lerLoja } from "@/lib/loja/servidor";

// PDF já no tamanho da etiqueta (50 × 30 mm por página), para baixar e imprimir
// sem depender do tamanho de página que cada navegador escolhe.
export async function GET(pedido: Request) {
  const url = new URL(pedido.url);
  const ids = lerIds(url.searchParams.getAll("ids"));
  await exigirPagina("pecas", "ver", `/etiquetas?${new URLSearchParams({ ids: ids.join(",") })}`);

  const loja = await lerLoja();
  const original = (loja.logo ? await lerImagemDaLoja(loja.logo) : null) ?? (await readFile(path.join(process.cwd(), "public", LOGO_PADRAO)));
  const logo = await sharp(original).resize({ width: 300, withoutEnlargement: true }).flatten({ background: "#ffffff" }).png().toBuffer();

  const encontradas = await prisma.peca.findMany({
    where: { id: { in: ids } },
    select: { id: true, codigo: true, nome: true, tamanho: true, precoCentavos: true },
  });
  const pecas = ids.flatMap((id) => encontradas.filter((p) => p.id === id));
  const origem = origemDaRequisicao(pedido.headers);
  const pdf = await pdfDasEtiquetas(
    pecas.map((p) => ({
      endereco: enderecoDaEtiqueta(origem, p.codigo),
      nome: p.nome,
      preco: p.precoCentavos > 0 ? formatarReais(p.precoCentavos) : null,
      codigo: p.codigo,
      tamanho: p.tamanho,
    })),
    logo,
    `Etiquetas ${loja.nome}`,
  );
  const nome = pecas.length === 1 ? `etiqueta-${pecas[0].codigo.toLowerCase()}.pdf` : `etiquetas-${pecas.length}.pdf`;
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${nome}"`,
      "cache-control": "private, no-store",
    },
  });
}
