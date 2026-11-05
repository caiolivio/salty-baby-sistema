import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Plus } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { listarCampanhas } from "@/lib/campanhas/servidor";
import { linkDaCampanha } from "@/lib/campanhas/regras";
import { dataHoraSP } from "@/lib/cupons/regras";
import { origemDaRequisicao } from "@/lib/etiquetas";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";

export const metadata: Metadata = { title: "Campanhas" };

// Campanhas de lançamento (página /c/<endereço> e faixa no alto do site). Só a administradora.
export default async function Campanhas() {
  await exigirAcesso("painel-administracao", "/painel/campanhas");
  const [campanhas, origem] = await Promise.all([listarCampanhas(), headers().then(origemDaRequisicao)]);
  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Campanhas</h1>
        <div className={proprios.acoes}>
          <Link href="/painel/campanhas/nova" className={proprios.botao}>
            <Plus className="icone" aria-hidden /> Nova campanha
          </Link>
        </div>
      </div>
      <p>
        Cada campanha tem uma página com as peças dos tamanhos dela, inclusive as &ldquo;Não listado&rdquo;, e uma faixa no alto do
        site com a contagem regressiva. Mande o link da página no grupo: ele leva a marca do grupo para medir as vendas.
      </p>
      {campanhas.length === 0 ? (
        <p>Nenhuma campanha criada ainda.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Link</th>
                <th>Tamanhos</th>
                <th>Contagem até</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {campanhas.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/painel/campanhas/${c.id}`}>{c.nome}</Link>
                  </td>
                  <td className={estilos.curta}>{linkDaCampanha(origem, c.codigo)}</td>
                  <td>{c.tamanhos.join(", ")}</td>
                  <td className={estilos.curta}>{c.ate ? dataHoraSP(c.ate.toISOString()) : "Sem contagem"}</td>
                  <td>
                    <span className={estilos.selo} data-status={c.ativa ? "publicada" : "vendida"}>
                      {c.ativa ? "No ar" : "Encerrada"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
