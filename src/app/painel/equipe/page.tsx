import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { formatarDataHora } from "@/lib/datas";
import { listarEquipe } from "@/lib/equipe/gravar";
import { resumoDoAcesso } from "@/lib/permissoes";
import estilos from "../painel.module.css";
import proprios from "../formulario.module.css";

export const metadata: Metadata = { title: "Equipe" };

export default async function Equipe({ searchParams }: PageProps<"/painel/equipe">) {
  await exigirAcesso("painel-administracao", "/painel/equipe");
  const { saiu } = await searchParams;
  const equipe = await listarEquipe();

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Equipe</h1>
        <div className={proprios.acoes}>
          <Link href="/painel/equipe/novo" className={proprios.botao}>
            <Plus className="icone" aria-hidden />
            Novo suporte
          </Link>
          <Link href="/painel/equipe/nova-administradora" className={proprios.botaoSecundario}>
            <Plus className="icone" aria-hidden />
            Nova administradora
          </Link>
        </div>
      </div>
      {saiu && (
        <p className={proprios.aviso} role="status">
          A pessoa saiu da equipe e não entra mais no painel.
        </p>
      )}
      <p>
        O suporte é alguém que ajuda a alimentar o sistema. Ele só usa as páginas que você escolher, e você pode mudar ou
        tirar o acesso quando quiser. Tudo o que ele faz fica no Histórico. A administradora tem todos os poderes, os
        mesmos que você.
      </p>
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Função</th>
              <th>Pode usar</th>
              <th>Último acesso</th>
            </tr>
          </thead>
          <tbody>
            {equipe.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/painel/equipe/${p.id}`}>{p.nome}</Link>
                  <br />
                  <span className={proprios.dica}>{p.email}</span>
                </td>
                <td data-rotulo="Função">{p.administradora ? "Administradora" : "Suporte"}</td>
                <td data-rotulo="Pode usar">{resumoDoAcesso(p.acesso)}</td>
                <td data-rotulo="Último acesso">{p.ultimoAcessoEm ? formatarDataHora(p.ultimoAcessoEm) : "Ainda não entrou"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
