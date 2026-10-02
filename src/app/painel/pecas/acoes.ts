"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { escolherCategorias, FORNECEDORA_LOJA, hojeEmSaoPaulo, lerFormularioPeca, situacaoEditavel, statusNoFormulario } from "@/lib/pecas/dados";
import { autorDe } from "@/lib/historico/regras";
import {
  adicionarFotos,
  atualizarPeca,
  criarPeca,
  duplicarPeca,
  excluirPeca,
  LIMITE_FOTOS,
  moverFoto,
  mudarStatusDaPeca,
  removerFoto,
} from "@/lib/pecas/gravar";
import type { StatusPeca } from "@/generated/prisma/client";

export type EstadoPeca =
  | { erro?: string; aviso?: string; valores?: Record<string, string>; categorias?: string[] }
  | undefined;

const TAMANHO_MAXIMO_FOTO = 12 * 1024 * 1024;

const valoresDigitados = (dados: FormData) =>
  Object.fromEntries([...dados.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

/** Categorias marcadas que podem ser usadas: as ativas e as que a peça já tinha. */
async function categoriasMarcadas(dados: FormData, pecaId?: string): Promise<string[]> {
  const permitidas = await prisma.categoria.findMany({
    where: { OR: [{ ativa: true }, ...(pecaId ? [{ pecas: { some: { pecaId } } }] : [])] },
    select: { id: true },
  });
  return escolherCategorias(dados.getAll("categorias"), permitidas.map((c) => c.id));
}

/** Fotos enviadas no formulário, já conferidas. */
async function fotosDoFormulario(dados: FormData): Promise<Buffer[] | string> {
  const arquivos = dados.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (arquivos.length > LIMITE_FOTOS) return `Envie no máximo ${LIMITE_FOTOS} fotos por peça.`;
  if (arquivos.some((f) => f.size > TAMANHO_MAXIMO_FOTO)) return "Uma das fotos é grande demais.";
  return Promise.all(arquivos.map(async (f) => Buffer.from(await f.arrayBuffer())));
}

const avisoFotos = (recusadas: number) => (recusadas > 0 ? `&fotosRecusadas=${recusadas}` : "");

export async function novaPeca(_estado: EstadoPeca, dados: FormData): Promise<EstadoPeca> {
  const usuario = await exigirAcesso("painel");
  const valores = valoresDigitados(dados);
  const categorias = await categoriasMarcadas(dados);
  const erro = (mensagem: string): EstadoPeca => ({ erro: mensagem, valores, categorias });

  const escolhida = valores.fornecedoraId ?? "";
  if (!escolhida) return erro("Escolha a fornecedora (ou Salty, se a peça é da loja).");
  const fornecedora =
    escolhida === FORNECEDORA_LOJA
      ? null
      : await prisma.fornecedora.findUnique({
          where: { id: escolhida },
          select: { id: true, codigo: true, percentualRepassePadrao: true },
        });
  if (escolhida !== FORNECEDORA_LOJA && !fornecedora) return erro("Esta fornecedora não existe mais.");

  const lido = lerFormularioPeca(valores, {
    consignada: Boolean(fornecedora),
    repassePadrao: fornecedora?.percentualRepassePadrao ?? 0,
    hoje: hojeEmSaoPaulo(),
  });
  if (!lido.ok) return erro(lido.erro);
  const fotos = await fotosDoFormulario(dados);
  if (typeof fotos === "string") return erro(fotos);

  const { id } = await criarPeca(lido.dados, fornecedora, categorias, autorDe(usuario));
  const { recusadas } = await adicionarFotos(id, fotos);
  redirect(`/painel/pecas/${id}?criada=1${avisoFotos(recusadas)}`);
}

export async function salvarPeca(_estado: EstadoPeca, dados: FormData): Promise<EstadoPeca> {
  const usuario = await exigirAcesso("painel");
  const valores = valoresDigitados(dados);
  const id = valores.id ?? "";
  const peca = await prisma.peca.findUnique({
    where: { id },
    select: {
      tipo: true,
      status: true,
      naoListada: true,
      dataEntrada: true,
      fornecedora: { select: { percentualRepassePadrao: true } },
    },
  });
  if (!peca) return { erro: "Esta peça não existe mais.", valores };
  const categorias = await categoriasMarcadas(dados, id);

  // Peça reservada, com devolução pedida ou vendida: a troca de status mexe no
  // pedido, na devolução ou só na entrega (mudarStatusDaPeca).
  const novo = valores.status ?? "";
  const trocaEspecial = !situacaoEditavel(peca.status) && novo !== "" && novo !== statusNoFormulario(peca.status, peca.naoListada);
  const fica = trocaEspecial ? novo : peca.status;
  const editavel = situacaoEditavel(fica);
  const lido = lerFormularioPeca(editavel ? valores : { ...valores, status: "" }, {
    consignada: peca.tipo === "consignada",
    repassePadrao: peca.fornecedora?.percentualRepassePadrao ?? 0,
    hoje: peca.dataEntrada.toISOString().slice(0, 10),
  });
  if (!lido.ok) return { erro: lido.erro, valores, categorias };

  if (trocaEspecial) {
    const r = await mudarStatusDaPeca(id, novo, autorDe(usuario));
    if (!r.ok) return { erro: r.erro, valores, categorias };
  }
  await atualizarPeca(id, lido.dados, categorias, autorDe(usuario), editavel ? undefined : (fica as StatusPeca));
  redirect(`/painel/pecas/${id}?salva=1`);
}

/** Só a administradora exclui. Peça vendida ou num pedido aberto não sai (motivoParaNaoExcluir). */
export async function excluir(dados: FormData): Promise<void> {
  const usuario = await exigirAcesso("painel-administracao");
  const id = String(dados.get("id") ?? "");
  const r = await excluirPeca(id, autorDe(usuario));
  if (!r.ok) redirect(`/painel/pecas/${id}?naoExcluida=1`);
  redirect(`/painel/pecas?excluida=${encodeURIComponent(r.codigo ?? "")}`);
}

export async function duplicar(dados: FormData): Promise<void> {
  const usuario = await exigirAcesso("painel");
  const copia = await duplicarPeca(String(dados.get("id") ?? ""), hojeEmSaoPaulo(), autorDe(usuario));
  if (!copia) redirect("/painel/pecas");
  redirect(`/painel/pecas/${copia.id}?duplicada=1`);
}

export async function enviarFotos(_estado: EstadoPeca, dados: FormData): Promise<EstadoPeca> {
  await exigirAcesso("painel");
  const id = String(dados.get("id") ?? "");
  if (!(await prisma.peca.findUnique({ where: { id }, select: { id: true } }))) return { erro: "Esta peça não existe mais." };
  const fotos = await fotosDoFormulario(dados);
  if (typeof fotos === "string") return { erro: fotos };
  if (fotos.length === 0) return { erro: "Escolha ou tire uma foto." };

  const { guardadas, recusadas } = await adicionarFotos(id, fotos);
  revalidatePath(`/painel/pecas/${id}`);
  if (recusadas > 0) {
    return { erro: `${guardadas} foto(s) guardada(s). ${recusadas} não entrou(aram): limite de ${LIMITE_FOTOS} fotos ou imagem que não abriu.` };
  }
  return { aviso: guardadas === 1 ? "Foto guardada." : `${guardadas} fotos guardadas.` };
}

export async function apagarFotoDaPeca(dados: FormData): Promise<void> {
  await exigirAcesso("painel");
  const id = String(dados.get("id") ?? "");
  await removerFoto(id, String(dados.get("fotoId") ?? ""));
  revalidatePath(`/painel/pecas/${id}`);
}

/** Muda a ordem das fotos: destacar (primeira), para antes ou para depois. */
export async function ordenarFoto(dados: FormData): Promise<void> {
  await exigirAcesso("painel");
  const id = String(dados.get("id") ?? "");
  const destino = Number(dados.get("destino"));
  if (!Number.isInteger(destino)) return;
  await moverFoto(id, String(dados.get("fotoId") ?? ""), destino);
  revalidatePath(`/painel/pecas/${id}`);
}
