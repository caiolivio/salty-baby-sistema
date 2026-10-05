import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirAcesso } from "@/lib/acesso";
import { pendentesDaFornecedora } from "@/lib/acertos/gravar";
import { DIAS_CONSOLIDACAO, marcadoDeInicio } from "@/lib/acertos/regras";
import { prisma } from "@/lib/banco";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { saldoParaCompras } from "@/lib/fornecedoras/saldo-para-compras";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import estilos from "../../../painel.module.css";
import { FormularioPagar } from "./formulario-pagar";
import { Voltar } from "@/componentes/voltar";

export const metadata: Metadata = { title: "Pagar repasses" };

export default async function PagarRepasses({ params }: PageProps<"/painel/acertos/pagar/[fornecedoraId]">) {
  const { fornecedoraId } = await params;
  await exigirAcesso("painel-administracao", `/painel/acertos/pagar/${fornecedoraId}`);
  const fornecedora = await prisma.fornecedora.findUnique({
    where: { id: fornecedoraId },
    select: { id: true, codigo: true, nome: true, pix: true },
  });
  if (!fornecedora) notFound();
  const hoje = hojeEmSaoPaulo();
  const [pendentes, saldo] = await Promise.all([pendentesDaFornecedora(fornecedora.id), saldoParaCompras(fornecedora.id)]);

  return (
    <>
      <p>
        <Voltar href="/painel/acertos">Contas a pagar</Voltar>
      </p>
      <h1 className={estilos.titulo}>
        Pagar repasses · {fornecedora.codigo} · {fornecedora.nome}
      </h1>
      <p>
        Chave Pix: <strong>{fornecedora.pix ?? "não cadastrada"}</strong>
      </p>
      {pendentes.length === 0 ? (
        <p>Esta fornecedora não tem repasses a pagar.</p>
      ) : (
        <>
          <p>
            Já vêm marcadas as vendas que entram no acerto deste mês. Pelo contrato, as vendas dos {DIAS_CONSOLIDACAO} dias antes
            do dia 1 ficam para o próximo acerto. Faça o Pix (ou o pagamento) primeiro e depois registre aqui. O sistema gera o
            comprovante para mandar no WhatsApp, e ele também fica na área da fornecedora.
          </p>
          {saldo.usadoPendenteCentavos > 0 && (
            <p>
              Ela já usou <strong>{formatarReais(saldo.usadoPendenteCentavos)}</strong> do repasse em compras com o saldo. Esse valor é
              descontado deste pagamento.
            </p>
          )}
          <FormularioPagar
            fornecedoraId={fornecedora.id}
            hoje={hoje}
            usadoCentavos={saldo.usadoPendenteCentavos}
            vendas={pendentes.map((i) => ({
              id: i.id,
              codigo: i.peca.codigo,
              nome: i.peca.nome,
              data: formatarData(i.data),
              valorPagoCentavos: i.valorPagoCentavos,
              repasseCentavos: i.repasseCentavos,
              marcado: marcadoDeInicio(i, hoje),
            }))}
          />
        </>
      )}
    </>
  );
}
