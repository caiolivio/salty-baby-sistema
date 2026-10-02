import "server-only";

// Conversa com o Google Drive pela API oficial, sem bibliotecas extras.
// A permissão pedida é "drive.file": o sistema só enxerga os arquivos que ele
// mesmo criou, nunca o resto do Drive da Salty.

// Os endereços podem ser trocados só para testes locais (um Drive de mentira).
const CONTAS = process.env.GOOGLE_TESTE_CONTAS ?? "https://accounts.google.com";
const OAUTH = process.env.GOOGLE_TESTE_OAUTH ?? "https://oauth2.googleapis.com";
const API = process.env.GOOGLE_TESTE_API ?? "https://www.googleapis.com";

const PERMISSOES = ["openid", "email", "https://www.googleapis.com/auth/drive.file"].join(" ");
const PASTA = "application/vnd.google-apps.folder";

export const COOKIE_ESTADO = "google_estado";

export class ErroDoDrive extends Error {
  constructor(
    mensagem: string,
    readonly precisaReconectar = false,
    /** Para a tela do painel explicar o problema ao conectar. */
    readonly codigo?: "sem-permissao" | "sem-autorizacao",
  ) {
    super(mensagem);
  }
}

/** fetch com prazo, e com uma mensagem clara quando a rede falha. */
async function buscar(endereco: string, opcoes: RequestInit): Promise<Response> {
  try {
    return await fetch(endereco, { ...opcoes, signal: AbortSignal.timeout(5 * 60 * 1000) });
  } catch (erro) {
    console.error("Falha de rede com o Google:", erro);
    throw new ErroDoDrive("Não foi possível falar com o Google (falha de rede). A próxima cópia tenta de novo.");
  }
}

export function driveConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Endereço que o Google chama de volta. Precisa estar cadastrado no Google Cloud. */
export function enderecoDeRetorno(): string {
  const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/google/retorno`;
}

export function enderecoDeAutorizacao(estado: string): string {
  const parametros = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: enderecoDeRetorno(),
    response_type: "code",
    scope: PERMISSOES,
    access_type: "offline",
    prompt: "consent", // garante que o Google devolva a autorização permanente
    include_granted_scopes: "true",
    state: estado,
  });
  return `${CONTAS}/o/oauth2/v2/auth?${parametros}`;
}

async function pedirToken(campos: Record<string, string>) {
  const resposta = await buscar(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...campos,
    }),
  });
  const dados = (await resposta.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    scope?: string;
    error?: string;
  };
  if (!resposta.ok || !dados.access_token) {
    if (dados.error === "invalid_grant") {
      throw new ErroDoDrive("A ligação com o Google Drive expirou ou foi desfeita. Conecte de novo no painel.", true);
    }
    throw new ErroDoDrive(`O Google recusou a autorização (${dados.error ?? resposta.status}).`);
  }
  return dados;
}

/** Troca o código que o Google mandou pela autorização permanente. */
export async function trocarCodigo(codigo: string) {
  const dados = await pedirToken({ code: codigo, grant_type: "authorization_code", redirect_uri: enderecoDeRetorno() });
  if (!dados.refresh_token) throw new ErroDoDrive("O Google não devolveu a autorização permanente. Tente conectar de novo.", false, "sem-autorizacao");
  if (!dados.scope?.includes("drive.file")) {
    throw new ErroDoDrive(
      "A permissão para guardar arquivos no Drive não foi marcada. Conecte de novo e marque essa opção.",
      false,
      "sem-permissao",
    );
  }
  return { autorizacao: dados.refresh_token, idToken: dados.id_token };
}

/** Uma chave de uso rápido (vale cerca de 1 hora) a partir da autorização permanente. */
export async function chaveDeAcesso(autorizacao: string): Promise<string> {
  const dados = await pedirToken({ refresh_token: autorizacao, grant_type: "refresh_token" });
  return dados.access_token!;
}

export async function revogar(autorizacao: string): Promise<void> {
  await fetch(`${OAUTH}/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: autorizacao }),
  }).catch(() => undefined);
}

async function chamar<T>(chave: string, caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await buscar(`${API}${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${chave}`, ...opcoes.headers },
  });
  if (resposta.status === 204) return undefined as T;
  const texto = await resposta.text();
  if (!resposta.ok) {
    let motivo = `${resposta.status}`;
    try {
      motivo = JSON.parse(texto).error?.message ?? motivo;
    } catch {}
    if (resposta.status === 403 && /quota|storage/i.test(motivo)) {
      throw new ErroDoDrive("O Google Drive está cheio. Libere espaço na conta ou troque de conta.");
    }
    throw new ErroDoDrive(`O Google Drive respondeu com erro: ${motivo}`, resposta.status === 401);
  }
  return JSON.parse(texto) as T;
}

type Arquivo = { id: string; name: string; trashed?: boolean };

const aspasDoDrive = (texto: string) => texto.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

/** A pasta guardada ainda existe (e não está na lixeira)? */
export async function pastaExiste(chave: string, id: string): Promise<boolean> {
  try {
    const pasta = await chamar<Arquivo>(chave, `/drive/v3/files/${encodeURIComponent(id)}?fields=id,trashed`);
    return !pasta.trashed;
  } catch (erro) {
    if (erro instanceof ErroDoDrive && erro.precisaReconectar) throw erro;
    return false;
  }
}

export async function criarPasta(chave: string, nome: string, paiId?: string): Promise<string> {
  const pasta = await chamar<Arquivo>(chave, "/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, mimeType: PASTA, ...(paiId ? { parents: [paiId] } : {}) }),
  });
  return pasta.id;
}

/** Acha a subpasta pelo nome (entre as que o sistema criou) ou cria. */
export async function subpasta(chave: string, nome: string, paiId: string): Promise<string> {
  const q = `name = '${aspasDoDrive(nome)}' and '${aspasDoDrive(paiId)}' in parents and mimeType = '${PASTA}' and trashed = false`;
  const achadas = await chamar<{ files: Arquivo[] }>(
    chave,
    `/drive/v3/files?${new URLSearchParams({ q, fields: "files(id)", pageSize: "1" })}`,
  );
  return achadas.files[0]?.id ?? criarPasta(chave, nome, paiId);
}

/** Arquivos (não pastas) dentro de uma pasta. */
export async function listarArquivos(chave: string, pastaId: string): Promise<Arquivo[]> {
  const todos: Arquivo[] = [];
  let pagina: string | undefined;
  do {
    const parametros = new URLSearchParams({
      q: `'${aspasDoDrive(pastaId)}' in parents and mimeType != '${PASTA}' and trashed = false`,
      fields: "nextPageToken,files(id,name)",
      pageSize: "1000",
      ...(pagina ? { pageToken: pagina } : {}),
    });
    const lote = await chamar<{ files: Arquivo[]; nextPageToken?: string }>(chave, `/drive/v3/files?${parametros}`);
    todos.push(...lote.files);
    pagina = lote.nextPageToken;
  } while (pagina);
  return todos;
}

export async function apagarArquivo(chave: string, id: string): Promise<void> {
  await chamar<void>(chave, `/drive/v3/files/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Envia um arquivo. Os grandes vão pelo envio "retomável", que aceita qualquer tamanho. */
export async function enviarArquivo(
  chave: string,
  pastaId: string,
  nome: string,
  conteudo: Buffer,
  tipo: string,
): Promise<string> {
  const metadados = JSON.stringify({ name: nome, parents: [pastaId] });
  if (conteudo.length <= 5 * 1024 * 1024) {
    const limite = `salty${Date.now().toString(36)}`;
    const corpo = Buffer.concat([
      Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadados}\r\n`),
      Buffer.from(`--${limite}\r\nContent-Type: ${tipo}\r\n\r\n`),
      conteudo,
      Buffer.from(`\r\n--${limite}--`),
    ]);
    const criado = await chamar<Arquivo>(chave, "/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${limite}` },
      body: new Uint8Array(corpo),
    });
    return criado.id;
  }
  const inicio = await buscar(`${API}/upload/drive/v3/files?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": tipo,
      "X-Upload-Content-Length": String(conteudo.length),
    },
    body: metadados,
  });
  const destino = inicio.headers.get("location");
  if (!inicio.ok || !destino) throw new ErroDoDrive(`O Google Drive não aceitou o envio (${inicio.status}).`);
  const envio = await buscar(destino, { method: "PUT", headers: { "Content-Type": tipo }, body: new Uint8Array(conteudo) });
  const criado = (await envio.json().catch(() => ({}))) as Partial<Arquivo>;
  if (!envio.ok || !criado.id) throw new ErroDoDrive(`O envio para o Google Drive falhou (${envio.status}).`);
  return criado.id;
}

export function linkDaPasta(id: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
}
