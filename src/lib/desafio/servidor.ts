import "server-only";
import { headers } from "next/headers";
import sharp from "sharp";
import { assinarDesafio, conferirDesafio, desenharDesafio, gerarTexto, VALIDADE_MS } from "./regras";

// Desafio contra robôs no servidor: a imagem vai como PNG (sem o texto dentro
// do código da página) e cada desafio só vale uma vez.

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado");
  return s;
}

export type Desafio = { imagem: string; ficha: string };

export async function novoDesafio(): Promise<Desafio> {
  const texto = gerarTexto();
  const png = await sharp(Buffer.from(desenharDesafio(texto))).png().toBuffer();
  return { imagem: `data:image/png;base64,${png.toString("base64")}`, ficha: assinarDesafio(texto, segredo()) };
}

// Desafios já usados (há um só processo no servidor), apagados depois que vencem.
const usados = new Map<string, number>();

export function desafioResolvido(ficha: unknown, resposta: unknown): ReturnType<typeof conferirDesafio> {
  const agora = Date.now();
  for (const [numero, quando] of usados) if (agora - quando > VALIDADE_MS) usados.delete(numero);
  const r = conferirDesafio(ficha, resposta, segredo(), agora);
  if (!r.ok) return r;
  if (usados.has(r.numero)) return { ok: false, motivo: "vencido" };
  usados.set(r.numero, agora);
  return r;
}

// Limite de envios por aparelho (endereço de internet): no máximo 5 por hora.
const MAXIMO_POR_HORA = 5;
const HORA = 60 * 60 * 1000;
const envios = new Map<string, number[]>();

export function podeEnviar(endereco: string, agora = Date.now()): boolean {
  const recentes = (envios.get(endereco) ?? []).filter((t) => agora - t < HORA);
  if (recentes.length >= MAXIMO_POR_HORA) {
    envios.set(endereco, recentes);
    return false;
  }
  recentes.push(agora);
  envios.set(endereco, recentes);
  return true;
}

/** Endereço de quem enviou, vindo do servidor web que fica na frente do site. */
export function enderecoDeQuemEnviou(cabecalhos: Headers): string {
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || cabecalhos.get("x-real-ip") || "desconhecido";
}

/**
 * Confere um formulário público: armadilha, desafio e limite por aparelho.
 * Devolve o erro para mostrar, ou nada se pode seguir.
 */
export async function conferirEnvioHumano(dados: FormData): Promise<string | undefined> {
  if (String(dados.get("empresa_site") ?? "").trim()) return "Não deu para enviar. Tente de novo.";
  const r = desafioResolvido(dados.get("desafio_ficha"), dados.get("desafio_resposta"));
  if (!r.ok) {
    if (r.motivo === "vencido") return "A imagem venceu. Digite as letras da imagem nova.";
    if (r.motivo === "rapido") return "Confira os dados e envie de novo.";
    return "As letras não conferem com a imagem. Digite as letras da imagem nova.";
  }
  if (!podeEnviar(enderecoDeQuemEnviou(await headers()))) {
    return "Muitos envios feitos deste aparelho. Tente de novo daqui a uma hora.";
  }
  return undefined;
}
