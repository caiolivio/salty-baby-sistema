import { exigirPagina } from "@/lib/acesso";
import { gerarCsv, gerarXlsx, nomeDoArquivo } from "@/lib/exportacao/planilha";
import { TABELAS } from "@/lib/exportacao/tabelas";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { podeVer, temExtra } from "@/lib/permissoes";

// Baixa uma tabela do painel em Excel (?formato=xlsx, padrão) ou CSV (?formato=csv).
export async function GET(pedido: Request, { params }: RouteContext<"/painel/exportar/[tabela]">) {
  const { tabela } = await params;
  const definicao = Object.hasOwn(TABELAS, tabela) ? TABELAS[tabela] : undefined;
  if (!definicao) return new Response("Tabela não encontrada", { status: 404 });
  const { acesso } = await exigirPagina(definicao.pagina, "ver", `/painel`);
  if (definicao.soAdministradora && !acesso.administradora) return new Response("Sem acesso", { status: 403 });
  const formato = new URL(pedido.url).searchParams.get("formato") === "csv" ? "csv" : "xlsx";
  const { colunas, linhas } = await definicao.carregar({
    documentos: acesso.administradora,
    valores: temExtra(acesso, "valores"),
    vendas: podeVer(acesso, "vendas"),
  });
  const nome = nomeDoArquivo(definicao.arquivo, hojeEmSaoPaulo(), formato);
  const cabecalhos = {
    "Content-Disposition": `attachment; filename="${nome}"`,
    "Cache-Control": "no-store",
  };
  if (formato === "csv") {
    return new Response(gerarCsv(colunas, linhas as never[]), {
      headers: { ...cabecalhos, "Content-Type": "text/csv; charset=utf-8" },
    });
  }
  const arquivo = gerarXlsx(colunas, linhas as never[], definicao.titulo);
  return new Response(new Uint8Array(arquivo), {
    headers: { ...cabecalhos, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  });
}
