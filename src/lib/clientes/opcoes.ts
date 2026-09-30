import "server-only";
import { prisma } from "../banco";
import { formatarTelefone, lerTelefoneCliente } from "../pedidos/regras";

export type OpcaoCliente = { id: string; nome: string; tel?: string; detalhe: string };

/** Clientes do cadastro para escolher numa lista, com o WhatsApp (ou a cidade) ao lado do nome. */
export async function listarOpcoesDeClientes(): Promise<OpcaoCliente[]> {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, telefone: true, cidade: true },
  });
  return clientes.map((c) => {
    const tel = lerTelefoneCliente(c.telefone);
    return { id: c.id, nome: c.nome, tel, detalhe: tel ? formatarTelefone(tel) : (c.cidade ?? "") };
  });
}
