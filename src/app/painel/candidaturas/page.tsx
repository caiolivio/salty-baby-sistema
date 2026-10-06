import type { Metadata } from "next";
import Link from "next/link";
import type { EtapaCandidatura } from "@/generated/prisma/client";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarDia } from "@/lib/datas";
import { NOMES_ETAPA } from "@/lib/fornecedoras/candidatura";
import { formatarTelefone } from "@/lib/pedidos/regras";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import visual from "./candidaturas.module.css";
import { BotoesExportar } from "../exportar/botoes";

export const metadata: Metadata = { title: "Seja fornecedora" };

const FILTROS: { valor: string; nome: string; etapas: EtapaCandidatura[] }[] = [
  { valor: "abertas", nome: "Em andamento", etapas: ["enviada", "aprovada", "acordo_aceito"] },
  { valor: "enviada", nome: "Aguardando curadoria", etapas: ["enviada"] },
  { valor: "acordo_aceito", nome: "Falta efetivar", etapas: ["aprovada", "acordo_aceito"] },
  { valor: "efetivada", nome: "Parceiras", etapas: ["efetivada"] },
  { valor: "recusada", nome: "Recusadas", etapas: ["recusada"] },
];

export default async function Candidaturas({ searchParams }: PageProps<"/painel/candidaturas">) {
  await exigirPagina("candidaturas", "ver", "/painel/candidaturas");
  const { etapa } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === etapa) ?? FILTROS[0];

  const candidaturas = await prisma.candidatura.findMany({
    where: { etapa: { in: filtro.etapas } },
    orderBy: { criadoEm: "desc" },
    take: 200,
    select: {
      id: true,
      nome: true,
      telefone: true,
      cidade: true,
      etapa: true,
      criadoEm: true,
      fornecedora: { select: { codigo: true } },
      _count: { select: { pecas: { where: { situacao: "proposta" } } } },
    },
  });

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Seja fornecedora</h1>
        <BotoesExportar tabela="candidaturas" />
      </div>
      <p>
        Inscrições feitas na página <Link href="/seja-fornecedora">Seja uma fornecedora</Link> do site. Aprove o passo 1 para
        ela receber o acesso e mandar mais peças (passo 2), e efetive a parceria quando combinar a entrega. O contrato completo ela aceita depois, no passo 3.
      </p>
      <nav className={visual.filtroEtapas} aria-label="Filtrar inscrições">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/painel/candidaturas?etapa=${f.valor}`}
            aria-current={f === filtro ? "page" : undefined}
          >
            {f.nome}
          </Link>
        ))}
      </nav>
      {candidaturas.length === 0 ? (
        <p>Nenhuma inscrição aqui.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>WhatsApp</th>
                <th>Cidade</th>
                <th>Etapa</th>
                <th className={estilos.numero}>Peças a avaliar</th>
                <th>Inscrição</th>
              </tr>
            </thead>
            <tbody>
              {candidaturas.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/painel/candidaturas/${c.id}`}>{c.nome}</Link>
                  </td>
                  <td>{formatarTelefone(c.telefone)}</td>
                  <td>{c.cidade ?? "—"}</td>
                  <td>
                    {NOMES_ETAPA[c.etapa]}
                    {c.fornecedora && ` · ${c.fornecedora.codigo}`}
                  </td>
                  <td className={estilos.numero}>{c._count.pecas}</td>
                  <td>{formatarDia(c.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
