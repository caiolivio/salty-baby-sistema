import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { RelatorioMensal } from "@/componentes/relatorio-mensal";
import { Voltar } from "@/componentes/voltar";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarDataHora } from "@/lib/datas";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { lerLoja } from "@/lib/loja/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { lerTelefoneCliente } from "@/lib/pedidos/regras";
import { lerMes, mesFechado, relatorioDoMes, textoDoRelatorio } from "@/lib/relatorios/regras";
import { vendasDoRelatorio } from "@/lib/relatorios/servidor";
import proprios from "../../../formulario.module.css";
import estilos from "../../../painel.module.css";
import { EnviarRelatorio } from "./enviar-relatorio";

export const metadata: Metadata = { title: "Relatório da fornecedora" };

export default async function RelatorioNoPainel({ params }: PageProps<"/painel/relatorios/[fornecedoraId]/[mes]">) {
  const { fornecedoraId, mes: texto } = await params;
  await exigirAcesso("painel-administracao", `/painel/relatorios/${fornecedoraId}/${texto}`);
  const mes = lerMes(texto);
  if (!mes || !mesFechado(mes, hojeEmSaoPaulo())) notFound();
  const [fornecedora, itens, loja, enviado] = await Promise.all([
    prisma.fornecedora.findUnique({ where: { id: fornecedoraId }, select: { id: true, codigo: true, nome: true, telefone: true } }),
    vendasDoRelatorio(fornecedoraId),
    lerLoja(),
    prisma.relatorioEnviado.findUnique({ where: { fornecedoraId_mes: { fornecedoraId, mes } }, select: { enviadoEm: true, quem: true } }),
  ]);
  if (!fornecedora) notFound();
  const relatorio = relatorioDoMes(itens, mes);
  const origem = origemDaRequisicao(await headers()).replace(/\/+$/, "");
  const mensagem = textoDoRelatorio({ loja: loja.nome, fornecedora, relatorio }, `${origem}/fornecedora/relatorios/${mes}`);
  const telefone = lerTelefoneCliente(fornecedora.telefone);

  return (
    <>
      <p>
        <Voltar href={`/painel/relatorios?mes=${mes}`}>Relatórios</Voltar>
      </p>
      <p className="sobretitulo">
        {fornecedora.codigo} · {fornecedora.nome}
      </p>
      <h1 className={estilos.titulo}>Relatório de {relatorio.nome}</h1>
      {relatorio.pecas > 0 && (
        <>
          {enviado ? (
            <p className={proprios.aviso} role="status">
              Enviado em {formatarDataHora(enviado.enviadoEm)} por {enviado.quem}.
            </p>
          ) : (
            !telefone && (
              <p className={proprios.aviso} role="status">
                Esta fornecedora não tem WhatsApp no cadastro: o WhatsApp abre para você escolher a conversa.
              </p>
            )
          )}
          <EnviarRelatorio texto={mensagem} telefone={telefone} fornecedoraId={fornecedora.id} mes={mes} />
        </>
      )}
      <RelatorioMensal relatorio={relatorio} />
      {relatorio.pecas > 0 && (
        <details>
          <summary>Ver o texto que vai no WhatsApp</summary>
          <pre className={estilos.textoPronto}>{mensagem}</pre>
        </details>
      )}
    </>
  );
}
