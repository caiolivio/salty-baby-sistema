import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../banco";
import { mudancaDeStatus, resumir, type Autor, type Mudanca, type TabelaDoHistorico } from "./regras";

type Cliente = Prisma.TransactionClient | typeof prisma;

/** Grava as mudanças de um registro. Sem mudanças, não grava nada. */
export async function registrar(
  tx: Cliente,
  registro: { tabela: TabelaDoHistorico; id: string; rotulo: string },
  mudancas: readonly Mudanca[],
  autor: Autor,
  motivo?: string,
): Promise<void> {
  if (mudancas.length === 0) return;
  await tx.alteracao.createMany({
    data: mudancas.map((m) => ({
      tabela: registro.tabela,
      registroId: registro.id,
      rotulo: registro.rotulo.slice(0, 191),
      campo: m.campo,
      antes: resumir(m.antes),
      depois: resumir(m.depois),
      restrito: m.restrito,
      usuarioId: autor.usuarioId,
      quem: autor.nome.slice(0, 191),
      motivo: motivo?.slice(0, 191) ?? null,
    })),
  });
}

export const rotuloDaPeca = (p: { codigo: string; nome: string }) => `${p.codigo} · ${p.nome}`;
export const rotuloDaFornecedora = (f: { codigo: string; nome: string }) => `${f.codigo} · ${f.nome}`;

type PecaComStatus = { id: string; codigo: string; nome: string; status: string; naoListada?: boolean };

/** Troca de status de várias peças (reserva, venda, devolução…), uma linha por peça. */
export async function registrarStatus(
  tx: Cliente,
  pecas: readonly PecaComStatus[],
  novo: { status: string; naoListada?: boolean },
  autor: Autor,
  motivo: string,
): Promise<void> {
  for (const p of pecas) {
    const mudanca = mudancaDeStatus(p, { naoListada: p.naoListada, ...novo });
    if (mudanca) await registrar(tx, { tabela: "peca", id: p.id, rotulo: rotuloDaPeca(p) }, [mudanca], autor, motivo);
  }
}

/** Uma linha só, para o cadastro de algo novo. */
export async function registrarCadastro(
  tx: Cliente,
  registro: { tabela: TabelaDoHistorico; id: string; rotulo: string },
  descricao: string,
  autor: Autor,
  motivo?: string,
): Promise<void> {
  await registrar(tx, registro, [{ campo: "Cadastro", antes: null, depois: descricao, restrito: false }], autor, motivo);
}

export const SELECAO_STATUS = { id: true, codigo: true, nome: true, status: true, naoListada: true } as const;
