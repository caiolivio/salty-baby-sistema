import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarReais } from "@/lib/dinheiro";
import { enderecoDaEtiqueta, FORMATOS, lerFormato, lerIds, origemDaRequisicao } from "@/lib/etiquetas";
import { BotaoImprimir } from "./imprimir";
import estilos from "./etiquetas.module.css";
import { imagensDaLoja, lerLoja } from "@/lib/loja/servidor";

export const metadata: Metadata = { title: "Etiquetas" };

// Fica fora do /painel para imprimir sem o menu, mas pede o mesmo acesso.
export default async function Etiquetas({ searchParams }: PageProps<"/etiquetas">) {
  const parametros = await searchParams;
  const ids = lerIds(parametros.ids);
  const formato = lerFormato(parametros.formato);
  const voltar = typeof parametros.voltar === "string" && parametros.voltar.startsWith("/painel") ? parametros.voltar : "/painel/pecas";
  await exigirPagina("pecas", "ver", `/etiquetas?${new URLSearchParams({ ids: ids.join(","), formato })}`);

  const loja = await lerLoja();
  const { logo } = imagensDaLoja(loja);
  const encontradas = await prisma.peca.findMany({
    where: { id: { in: ids } },
    select: { id: true, codigo: true, nome: true, tamanho: true, precoCentavos: true },
  });
  // Na ordem em que foram escolhidas.
  const pecas = ids.flatMap((id) => encontradas.filter((p) => p.id === id));
  const origem = origemDaRequisicao(await headers());
  const qrs = await Promise.all(
    pecas.map((p) => QRCode.toString(enderecoDaEtiqueta(origem, p.codigo), { type: "svg", margin: 0, errorCorrectionLevel: "M" })),
  );
  const trocar = (f: string) => `/etiquetas?${new URLSearchParams({ ids: ids.join(","), formato: f, voltar })}`;

  return (
    <div className={formato === "rolo" ? estilos.rolo : estilos.a4}>
      {/* Tamanho da página na impressão: A4 ou uma etiqueta por página. */}
      <style>{formato === "rolo" ? "@page { size: 50mm 30mm; margin: 0 } @media print { body { margin: 0 } }" : "@page { size: A4; margin: 8mm } @media print { body { margin: 0 } }"}</style>
      <div className={estilos.barra}>
        <Link href={voltar}>← Voltar</Link>
        <strong>
          {pecas.length} etiqueta(s)
        </strong>
        <span className={estilos.formatos}>
          {Object.entries(FORMATOS).map(([valor, { nome }]) =>
            valor === formato ? (
              <strong key={valor}>{nome}</strong>
            ) : (
              <Link key={valor} href={trocar(valor)}>
                {nome}
              </Link>
            ),
          )}
        </span>
        <BotaoImprimir className={estilos.imprimir} />
        {formato === "rolo" ? (
          <span className={estilos.dica}>Na janela de impressão, escolha a impressora de etiquetas e o papel 50 × 30 mm.</span>
        ) : (
          <span className={estilos.dica}>Na janela de impressão, deixe a escala em 100% (tamanho real). As linhas tracejadas são para recortar.</span>
        )}
      </div>
      {pecas.length === 0 ? (
        <p className={estilos.vazio}>Nenhuma peça escolhida. Volte para a lista de peças e marque as que quer imprimir.</p>
      ) : (
        <div className={estilos.folha}>
          {pecas.map((p, i) => (
            <div key={p.id} className={estilos.etiqueta}>
              <div className={estilos.qr} dangerouslySetInnerHTML={{ __html: qrs[i] }} />
              <div className={estilos.texto}>
                {/* eslint-disable-next-line @next/next/no-img-element -- impressão: a imagem precisa estar pronta, sem carregamento tardio */}
                <img className={estilos.logo} src={logo} alt={loja.nome} />
                <span className={estilos.nome}>{p.nome}</span>
                {p.precoCentavos > 0 && <strong className={estilos.preco}>{formatarReais(p.precoCentavos)}</strong>}
                <span className={estilos.codigo}>{p.codigo}</span>
                {/* Linha própria: "Tam. 10 anos" junto do código não cabia na etiqueta. */}
                {p.tamanho && <span className={estilos.tamanho}>Tam. {p.tamanho}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
