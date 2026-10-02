// Acordo de consignação mostrado no passo 2 e guardado no passo 3. Texto
// provisório: a loja vai trocar pelo definitivo. Ao mudar o texto, mude
// também a versão, para saber qual versão cada fornecedora aceitou.

export const VERSAO_ACORDO = "2026-10-v2";

type DadosDoAcordo = { nome: string; nomeCurto: string; repassePadrao: number; mesesDevolucao: number };

const porcento = (pontosBase: number) => `${(pontosBase / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

/** Título e seções do acordo, com o nome e as regras da loja (configurações). */
export function acordoDaLoja(loja: DadosDoAcordo): { titulo: string; secoes: { titulo: string; texto: string }[] } {
  const { nome, nomeCurto } = loja;
  return {
    titulo: `Acordo de consignação ${nome}`,
    secoes: [
      {
        titulo: "1. Como funciona",
        texto: `A fornecedora deixa as peças com a ${nome}, que as fotografa, anuncia e vende no site, na loja e nos grupos de WhatsApp. A peça continua sendo da fornecedora até ser vendida.`,
      },
      {
        titulo: "2. Curadoria e preço",
        texto: `A ${nomeCurto} avalia cada peça e pode não aceitar as que não estiverem em bom estado ou não combinarem com a loja. O preço de venda é sempre definido pela ${nomeCurto}.`,
      },
      {
        titulo: "3. Repasse",
        texto: `Quando a peça é vendida, a fornecedora recebe a parte combinada do valor pago pela cliente (o repasse, normalmente ${porcento(loja.repassePadrao)}). Se houver desconto ou cupom, em regra o repasse é calculado sobre o valor com desconto, ou seja, o desconto é dividido entre a ${nomeCurto} e a fornecedora. A ${nomeCurto} pode assumir um desconto sozinha, sem mudar o repasse. Um desconto só por conta da fornecedora acontece apenas com a autorização dela, e nunca passa do repasse da peça. Cada venda mostra, na área da fornecedora, o desconto e quanto ele mudou o repasse.`,
      },
      {
        titulo: "4. Pagamento",
        texto: `No dia 1 de cada mês, a ${nomeCurto} calcula os repasses das vendas do mês anterior e combina o pagamento com a fornecedora. A fornecedora também pode usar o saldo para comprar na ${nomeCurto}.`,
      },
      {
        titulo: "5. Devolução das peças",
        texto: `A fornecedora pode pedir a devolução de peças não vendidas depois de ${loja.mesesDevolucao} meses do cadastro de cada peça no site. A data de quando cada peça pode ser devolvida aparece na área da fornecedora.`,
      },
      {
        titulo: "6. Cuidados",
        texto: `A ${nomeCurto} cuida das peças com atenção. Em caso de avaria ou perda enquanto a peça estiver com a ${nomeCurto}, as duas partes combinam a solução.`,
      },
    ],
  };
}
