import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComprovanteAcerto } from "@/componentes/comprovante-acerto";
import { exigirAcesso } from "@/lib/acesso";
import { buscarAcerto } from "@/lib/acertos/gravar";
import { textoDoComprovante } from "@/lib/acertos/regras";
import { origemDaRequisicao } from "@/lib/etiquetas";
import { lerLoja } from "@/lib/loja/servidor";
import { lerTelefoneCliente } from "@/lib/pedidos/regras";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { desfazer } from "../acoes";
import { EnviarComprovante } from "./enviar-comprovante";

export const metadata: Metadata = { title: "Comprovante de repasse" };

export default async function Comprovante({ params, searchParams }: PageProps<"/painel/acertos/[id]">) {
  const { id } = await params;
  await exigirAcesso("painel-administracao", `/painel/acertos/${id}`);
  const aviso = await searchParams;
  const acerto = await buscarAcerto(id);
  if (!acerto) notFound();
  const loja = await lerLoja();
  const origem = origemDaRequisicao(await headers()).replace(/\/+$/, "");
  const texto = textoDoComprovante(
    {
      loja: loja.nome,
      numero: acerto.numero,
      fornecedora: acerto.fornecedora,
      data: acerto.data,
      forma: acerto.forma,
      totalCentavos: acerto.totalCentavos,
      observacao: acerto.observacao,
      itens: acerto.itens.map((i) => ({ ...i.peca, data: i.venda.data, valorPagoCentavos: i.valorPagoCentavos, repasseCentavos: i.repasseCentavos })),
    },
    `${origem}/fornecedora/pagamentos/${acerto.id}`,
  );

  return (
    <>
      <p>
        <Link href="/painel/acertos">← Contas a pagar</Link>
      </p>
      <h1 className={estilos.titulo}>Comprovante de repasse nº {acerto.numero}</h1>
      {aviso.pago && !acerto.canceladoEm && (
        <p className={proprios.aviso} role="status">
          Pagamento registrado. As vendas ficaram como pagas na área da fornecedora. Agora envie o comprovante no WhatsApp.
        </p>
      )}
      {!acerto.canceladoEm && <EnviarComprovante texto={texto} telefone={lerTelefoneCliente(acerto.fornecedora.telefone)} />}
      <ComprovanteAcerto acerto={acerto} loja={loja.nome} mostrarQuem />
      {!acerto.canceladoEm && (
        <details className={proprios.zonaPerigo}>
          <summary>Desfazer este pagamento</summary>
          <p>
            Use só se o pagamento foi registrado por engano. As vendas voltam a ficar a pagar, o comprovante some da área da
            fornecedora e a mudança fica no histórico dela.
          </p>
          <form action={desfazer}>
            <input type="hidden" name="id" value={acerto.id} />
            <button type="submit" className={proprios.botaoPerigo}>
              Desfazer pagamento
            </button>
          </form>
        </details>
      )}
    </>
  );
}
