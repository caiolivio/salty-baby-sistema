import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import { mostrarPercentual } from "@/lib/fornecedoras/dados";
import { whatsappNaTela } from "@/lib/loja/regras";
import { imagensDaLoja, lerLoja, prefixoEmUso } from "@/lib/loja/servidor";
import estilos from "../painel.module.css";
import { HistoricoDoRegistro } from "../historico/do-registro";
import { FormularioLoja } from "./formulario-loja";

export const metadata: Metadata = { title: "Configurações" };

export default async function Configuracoes() {
  await exigirAcesso("painel-administracao", "/painel/configuracoes");
  const loja = await lerLoja();
  const imagens = imagensDaLoja(loja);

  return (
    <>
      <h1 className={estilos.titulo}>Configurações da loja</h1>
      <p>
        Nome, contato, cores, logo e regras da loja. Tudo o que muda aqui aparece no site, no painel, nas etiquetas e nas
        mensagens do WhatsApp.
      </p>
      <FormularioLoja
        iniciais={{
          nome: loja.nome,
          nomeCurto: loja.nomeCurto,
          slogan: loja.slogan ?? "",
          descricao: loja.descricao ?? "",
          whatsapp: whatsappNaTela(loja.whatsapp),
          instagram: loja.instagram ? `@${loja.instagram}` : "",
          corDestaque: loja.corDestaque,
          corPrincipal: loja.corPrincipal,
          corTexto: loja.corTexto,
          prefixoLoja: loja.prefixoLoja,
          repassePadrao: mostrarPercentual(loja.repassePadrao),
          minutosReserva: String(loja.minutosReserva),
          mesesDevolucao: String(loja.mesesDevolucao),
          mesesSacolinha: String(loja.mesesSacolinha),
        }}
        imagens={{ ...imagens, logoPropria: Boolean(loja.logo), iconePropria: Boolean(loja.icone) }}
        prefixoFixo={await prefixoEmUso(loja.prefixoLoja)}
      />
      <HistoricoDoRegistro tabela="loja" registroId="1" verRestritos />
    </>
  );
}
