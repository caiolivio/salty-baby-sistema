import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { podeApagarImportacao } from "@/lib/importacao/gravar";
import { apagarImportacao } from "./acoes";
import { ImportadorNotion } from "./importador";
import estilos from "./importar.module.css";
import painel from "../painel.module.css";

export const metadata: Metadata = { title: "Importar do Notion · Salty Baby" };

export default async function Importar() {
  await exigirAcesso("painel-administracao", "/painel/importar");
  const [fornecedoras, pecas, semFoto, vendas] = await Promise.all([
    prisma.fornecedora.count(),
    prisma.peca.count(),
    prisma.peca.count({ where: { fotos: { none: {} } } }),
    prisma.venda.count(),
  ]);
  const importado = fornecedoras + pecas > 0;

  return (
    <>
      <h1 className={painel.titulo}>Importar do Notion</h1>
      {!importado && <ImportadorNotion />}
      {importado && (
        <div className={estilos.caixa}>
          <p>
            A importação já foi feita: {fornecedoras} fornecedoras, {pecas} peças e {vendas} vendas.{" "}
            <Link href="/painel/pecas">Ver as peças</Link>
          </p>
          {semFoto > 0 && <p>{semFoto} peça(s) ainda estão sem foto.</p>}
        </div>
      )}
      {importado && semFoto > 0 && <ImportadorNotion somenteFotos />}
      {importado && podeApagarImportacao() && (
        <form action={apagarImportacao} className={estilos.caixa}>
          <p>
            Só no site de teste: apague tudo o que foi importado (fornecedoras, peças, fotos, clientes e vendas) para
            testar a importação de novo.
          </p>
          <button type="submit" className={estilos.botaoPerigo}>
            Apagar a importação
          </button>
        </form>
      )}
    </>
  );
}
