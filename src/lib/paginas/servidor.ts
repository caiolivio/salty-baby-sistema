import "server-only";
import { cache } from "react";
import { prisma } from "../banco";
import { registrar, rotuloDaFornecedora } from "../historico/gravar";
import type { Autor } from "../historico/regras";
import { formatarDataHora } from "../datas";
import { lerLoja } from "../loja/servidor";
import {
  blocosDoTexto,
  FORA_DO_RODAPE,
  NO_AR_SEM_SALVAR,
  PAGINAS_EDITAVEIS,
  preencher,
  TEXTOS_INICIAIS,
  versaoDoAcordo,
  type Bloco,
  type ChavePagina,
  type DadosDaPagina,
} from "./regras";

export type PaginaLida = {
  chave: ChavePagina;
  titulo: string;
  conteudo: string;
  publicada: boolean;
  /** 0 = nunca salva (texto inicial). */
  versao: number;
  atualizadoEm: Date | null;
  quem: string | null;
};

/** A página como está guardada (com as variáveis), ou o texto inicial se nunca foi salva. */
export const lerPagina = cache(async (chave: ChavePagina): Promise<PaginaLida> => {
  const linha = await prisma.pagina.findUnique({ where: { chave } });
  if (linha) return { ...linha, chave };
  return {
    chave,
    ...TEXTOS_INICIAIS[chave],
    publicada: NO_AR_SEM_SALVAR.includes(chave),
    versao: 0,
    atualizadoEm: null,
    quem: null,
  };
});

/** A página pronta para mostrar: variáveis trocadas e o texto em blocos. */
export async function paginaParaMostrar(chave: ChavePagina): Promise<{ titulo: string; blocos: Bloco[]; publicada: boolean }> {
  const [pagina, loja] = await Promise.all([lerPagina(chave), lerLoja()]);
  return { titulo: preencher(pagina.titulo, loja), blocos: blocosDoTexto(preencher(pagina.conteudo, loja)), publicada: pagina.publicada };
}

/** As páginas no ar, para os links do rodapé. */
export async function paginasNoAr(): Promise<{ nome: string; endereco: string }[]> {
  const salvas = await prisma.pagina.findMany({ select: { chave: true, publicada: true } });
  return PAGINAS_EDITAVEIS.filter((p) => {
    if (FORA_DO_RODAPE.includes(p.chave)) return false;
    const salva = salvas.find((s) => s.chave === p.chave);
    return salva ? salva.publicada : NO_AR_SEM_SALVAR.includes(p.chave);
  }).map((p) => ({ nome: p.nome, endereco: p.endereco }));
}

/** Versão do acordo que vale hoje, gravada quando a fornecedora aceita. */
export async function versaoAtualDoAcordo(): Promise<string> {
  const linha = await prisma.pagina.findUnique({ where: { chave: "contrato" }, select: { versao: true } });
  return versaoDoAcordo(linha?.versao ?? null);
}

/**
 * Salva a página como uma versão nova. No acordo, com "exigirAceite", as
 * fornecedoras que já tinham aceitado precisam aceitar de novo no próximo
 * acesso (o aceite anterior fica no histórico de cada uma).
 */
export async function salvarPagina(
  chave: ChavePagina,
  dados: DadosDaPagina,
  autor: Autor,
): Promise<{ versao: number; reaceites: number }> {
  return prisma.$transaction(async (tx) => {
    const atual = await tx.pagina.findUnique({ where: { chave } });
    const versao = (atual?.versao ?? 0) + 1;
    const campos = { titulo: dados.titulo, conteudo: dados.conteudo, publicada: dados.publicada, versao, quem: autor.nome.slice(0, 191) };
    if (atual) await tx.pagina.update({ where: { chave }, data: campos });
    else await tx.pagina.create({ data: { chave, ...campos } });
    await tx.versaoDePagina.create({
      data: { chave, ...campos, exigiuAceite: dados.exigirAceite, usuarioId: autor.usuarioId },
    });

    let reaceites = 0;
    if (chave === "contrato" && dados.exigirAceite) {
      const fornecedoras = await tx.fornecedora.findMany({
        where: { termosAceitosEm: { not: null } },
        select: { id: true, codigo: true, nome: true, termosAceitosEm: true, termosVersao: true },
      });
      for (const f of fornecedoras) {
        await registrar(
          tx,
          { tabela: "fornecedora", id: f.id, rotulo: rotuloDaFornecedora(f) },
          [
            {
              campo: "Acordo aceito",
              antes: `${formatarDataHora(f.termosAceitosEm!)} (versão ${f.termosVersao ?? "?"})`,
              depois: `Precisa aceitar a versão ${versaoDoAcordo(versao)}`,
              restrito: false,
            },
          ],
          autor,
          "Acordo de consignação mudou",
        );
      }
      reaceites = (await tx.fornecedora.updateMany({ where: { termosAceitosEm: { not: null } }, data: { termosAceitosEm: null } })).count;
    }
    return { versao, reaceites };
  });
}

/** Versões salvas de uma página, da mais nova para a mais antiga. */
export function versoesDaPagina(chave: ChavePagina) {
  return prisma.versaoDePagina.findMany({
    where: { chave },
    orderBy: { versao: "desc" },
    take: 30,
    select: { id: true, versao: true, titulo: true, conteudo: true, publicada: true, exigiuAceite: true, quem: true, criadoEm: true },
  });
}
