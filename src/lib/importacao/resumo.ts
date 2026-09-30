import type { PlanoImportacao } from "./notion";

export type ResumoImportacao = {
  fornecedoras: number;
  pecas: number;
  pecasDaLoja: number;
  pecasPorSituacao: Record<string, number>;
  pecasComFoto: number;
  clientes: number;
  vendas: number;
  itensVendidos: number;
  totalVendidoCentavos: number;
  descontosCentavos: number;
  repasseEmAbertoCentavos: number;
  repasseJaPagoCentavos: number;
  lucroCentavos: number;
  proximaFornecedora: string;
  avisos: string[];
};

export function resumirPlano(plano: PlanoImportacao): ResumoImportacao {
  const itens = plano.vendas.flatMap((v) => v.itens);
  const soma = (valores: number[]) => valores.reduce((a, b) => a + b, 0);
  const pecasPorSituacao: Record<string, number> = {};
  for (const p of plano.pecas) pecasPorSituacao[p.status] = (pecasPorSituacao[p.status] ?? 0) + 1;
  const proximo = (plano.sequencias.fornecedora ?? 0) + 1;

  return {
    fornecedoras: plano.fornecedoras.length,
    pecas: plano.pecas.length,
    pecasDaLoja: plano.pecas.filter((p) => p.tipo === "loja").length,
    pecasPorSituacao,
    pecasComFoto: plano.pecas.filter((p) => p.foto).length,
    clientes: plano.clientes.length,
    vendas: plano.vendas.length,
    itensVendidos: itens.length,
    totalVendidoCentavos: soma(plano.vendas.map((v) => v.totalCentavos)),
    descontosCentavos: soma(plano.vendas.map((v) => v.descontoCentavos)),
    repasseEmAbertoCentavos: soma(itens.filter((i) => !i.repasseRecebido).map((i) => i.repasseCentavos)),
    repasseJaPagoCentavos: soma(itens.filter((i) => i.repasseRecebido).map((i) => i.repasseCentavos)),
    lucroCentavos: soma(itens.map((i) => i.lucroCentavos)),
    proximaFornecedora: `F${String(proximo).padStart(2, "0")}`,
    avisos: [
      ...plano.avisos,
      ...plano.pecas.flatMap((p) => p.avisos.map((a) => `${p.codigo} (antigo ${p.codigoAntigo}, ${p.nome}): ${a}`)),
    ],
  };
}
