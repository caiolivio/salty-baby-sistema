import { usuarioAtual } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { guardarFotoDePeca } from "@/lib/fotos";
import { podeAcessar } from "@/lib/permissoes";

const LIMITE = 15 * 1024 * 1024;

// Recebe as fotos da importação do Notion, uma por vez.
export async function POST(pedido: Request) {
  const usuario = await usuarioAtual();
  if (!usuario || !podeAcessar(usuario.perfis, "painel-administracao")) {
    return Response.json({ erro: "Sem permissão." }, { status: 403 });
  }

  const dados = await pedido.formData();
  const codigo = dados.get("codigo");
  const foto = dados.get("foto");
  if (typeof codigo !== "string" || !(foto instanceof Blob) || foto.size === 0 || foto.size > LIMITE) {
    return Response.json({ erro: "Foto inválida." }, { status: 400 });
  }

  const peca = await prisma.peca.findUnique({ where: { codigo }, select: { id: true, _count: { select: { fotos: true } } } });
  if (!peca) return Response.json({ erro: `Peça ${codigo} não encontrada.` }, { status: 404 });
  if (peca._count.fotos > 0) return Response.json({ ok: true, jaTinha: true });

  try {
    const arquivo = await guardarFotoDePeca(peca.id, Buffer.from(await foto.arrayBuffer()));
    await prisma.fotoPeca.create({ data: { pecaId: peca.id, arquivo, ordem: 0 } });
    return Response.json({ ok: true });
  } catch (erro) {
    console.error(`Falha ao guardar a foto de ${codigo}:`, erro);
    return Response.json({ erro: "Não consegui ler esta imagem." }, { status: 422 });
  }
}
