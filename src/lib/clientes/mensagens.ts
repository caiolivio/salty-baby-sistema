import "server-only";
import { prisma } from "../banco";
import { registrar } from "../historico/gravar";
import type { Autor } from "../historico/regras";

// LGPD: a cliente escolhe se recebe novidades e lembretes da loja pelo
// WhatsApp (cadastro, Minha conta ou a loja, quando ela pede para sair).
// As listas de mensagens de novidade do "Enviar hoje" pulam quem não aceita.

export const textoDoAceite = (aceita: boolean) => (aceita ? "Aceita" : "Não aceita");

export async function gravarAceiteDeMensagens(clienteId: string, aceita: boolean, autor: Autor): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.cliente.findUnique({ where: { id: clienteId }, select: { nome: true, aceitaMensagens: true } });
    if (!atual || atual.aceitaMensagens === aceita) return;
    await tx.cliente.update({ where: { id: clienteId }, data: { aceitaMensagens: aceita, mensagensAlteradoEm: new Date() } });
    await registrar(
      tx,
      { tabela: "cliente", id: clienteId, rotulo: atual.nome },
      [{ campo: "Mensagens no WhatsApp", antes: textoDoAceite(atual.aceitaMensagens), depois: textoDoAceite(aceita), restrito: false }],
      autor,
    );
  });
}
