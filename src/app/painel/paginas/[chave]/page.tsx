import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { formatarDataHora } from "@/lib/datas";
import { lerLoja } from "@/lib/loja/servidor";
import { ehChavePagina, NO_AR_SEM_SALVAR, paginaEditavel, versaoDoAcordo } from "@/lib/paginas/regras";
import { lerPagina, versoesDaPagina } from "@/lib/paginas/servidor";
import estilos from "../../painel.module.css";
import proprio from "../paginas.module.css";
import { EditorDePagina } from "./editor";

export async function generateMetadata({ params }: PageProps<"/painel/paginas/[chave]">): Promise<Metadata> {
  const { chave } = await params;
  return { title: ehChavePagina(chave) ? paginaEditavel(chave).nome : "Páginas" };
}

export default async function EditarPagina({ params }: PageProps<"/painel/paginas/[chave]">) {
  const { chave } = await params;
  await exigirAcesso("painel-administracao", `/painel/paginas/${chave}`);
  if (!ehChavePagina(chave)) notFound();
  const info = paginaEditavel(chave);
  const [pagina, versoes, loja] = await Promise.all([lerPagina(chave), versoesDaPagina(chave), lerLoja()]);
  const ehAcordo = chave === "contrato";

  return (
    <>
      <h1 className={estilos.titulo}>{info.nome}</h1>
      <p>{info.explica}</p>
      <p className={proprio.situacao}>
        {pagina.versao === 0
          ? NO_AR_SEM_SALVAR.includes(chave)
            ? "Texto inicial, já no ar. Revise e salve para virar a versão 1."
            : "Texto inicial, ainda fora do ar. Revise, marque \"Página no ar\" e salve."
          : `Versão ${pagina.versao}, salva em ${formatarDataHora(pagina.atualizadoEm!)} por ${pagina.quem}. ${pagina.publicada ? "No ar." : "Fora do ar."}`}{" "}
        {pagina.publicada && (
          <Link href={info.endereco} target="_blank">
            Abrir no site <ExternalLink className="icone" aria-hidden />
          </Link>
        )}
      </p>
      {chave !== "sobre" && <p className={proprio.situacao}>É um texto com valor legal: vale pedir para um advogado revisar.</p>}
      <EditorDePagina
        chave={chave}
        titulo={pagina.titulo}
        conteudo={pagina.conteudo}
        publicada={pagina.publicada}
        sempreNoAr={NO_AR_SEM_SALVAR.includes(chave)}
        ehAcordo={ehAcordo}
        loja={{
          nome: loja.nome,
          nomeCurto: loja.nomeCurto,
          whatsapp: loja.whatsapp,
          repassePadrao: loja.repassePadrao,
          mesesDevolucao: loja.mesesDevolucao,
          mesesSacolinha: loja.mesesSacolinha,
        }}
      />
      {versoes.length > 0 && (
        <section aria-labelledby="versoes">
          <h2 id="versoes">Versões salvas</h2>
          <ul className={proprio.versoes}>
            {versoes.map((v) => (
              <li key={v.id}>
                <details>
                  <summary>
                    Versão {v.versao} · {formatarDataHora(v.criadoEm)} · {v.quem}
                    {!v.publicada && " · fora do ar"}
                    {ehAcordo && ` · aceite "${versaoDoAcordo(v.versao)}"`}
                    {v.exigiuAceite && " · pediu novo aceite"}
                  </summary>
                  <pre>{`${v.titulo}\n\n${v.conteudo}`}</pre>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
