import "server-only";
import { prisma } from "@/lib/banco";
import { listarOpcoesDeClientes } from "@/lib/clientes/opcoes";

/** Listas do formulário do cupom: clientes e fornecedoras. */
export async function opcoesDoCupom() {
  const [clientes, fornecedoras] = await Promise.all([
    listarOpcoesDeClientes(),
    prisma.fornecedora.findMany({ orderBy: { numero: "asc" }, select: { id: true, codigo: true, nome: true } }),
  ]);
  return {
    clientes: clientes.map(({ id, nome, detalhe }) => ({ id, nome, detalhe })),
    fornecedoras: fornecedoras.map((f) => ({ id: f.id, nome: `${f.codigo} · ${f.nome}` })),
  };
}
