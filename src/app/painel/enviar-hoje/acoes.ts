"use server";

import { refresh } from "next/cache";
import { exigirAcesso, exigirPagina } from "@/lib/acesso";
import { marcarMensagem } from "@/lib/hoje/servidor";
import { TIPOS_DE_MENSAGEM, type TipoDeMensagem } from "@/lib/hoje/regras";

/** "Enviar no WhatsApp" ou "Copiar texto": a mensagem sai da lista "Enviar hoje". */
export async function mensagemMandada(tipo: TipoDeMensagem, referencia: string) {
  if (!TIPOS_DE_MENSAGEM.includes(tipo) || typeof referencia !== "string" || referencia.length > 191) return;
  // A peça vendida mostra o repasse: só a administradora. As outras são das clientes.
  const usuario =
    tipo === "peca_vendida"
      ? await exigirAcesso("painel-administracao", "/painel/enviar-hoje")
      : await exigirPagina(tipo === "pedido_nao_pago" ? "pedidos" : "clientes", "alterar", "/painel/enviar-hoje");
  await marcarMensagem(tipo, referencia, usuario.nome);
  refresh();
}
