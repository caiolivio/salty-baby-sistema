// Acordo de consignação mostrado no passo 2 e guardado no passo 3. Texto
// provisório: a Salty vai trocar pelo definitivo. Ao mudar o texto, mude
// também a versão, para saber qual versão cada fornecedora aceitou.

export const VERSAO_ACORDO = "2026-10-v1";

export const TITULO_ACORDO = "Acordo de consignação Salty Baby";

export const ACORDO: { titulo: string; texto: string }[] = [
  {
    titulo: "1. Como funciona",
    texto:
      "A fornecedora deixa as peças com a Salty Baby, que as fotografa, anuncia e vende no site, na loja e nos grupos de WhatsApp. A peça continua sendo da fornecedora até ser vendida.",
  },
  {
    titulo: "2. Curadoria e preço",
    texto:
      "A Salty avalia cada peça e pode não aceitar as que não estiverem em bom estado ou não combinarem com a loja. O preço de venda é sempre definido pela Salty.",
  },
  {
    titulo: "3. Repasse",
    texto:
      "Quando a peça é vendida, a fornecedora recebe a parte combinada do valor pago pela cliente (o repasse, normalmente 40%). Se houver desconto ou cupom, o repasse é calculado sobre o valor com desconto, ou seja, o desconto é dividido entre a Salty e a fornecedora.",
  },
  {
    titulo: "4. Pagamento",
    texto:
      "No dia 1 de cada mês, a Salty calcula os repasses das vendas do mês anterior e combina o pagamento com a fornecedora. A fornecedora também pode usar o saldo para comprar na Salty.",
  },
  {
    titulo: "5. Devolução das peças",
    texto:
      "A fornecedora pode pedir a devolução de peças não vendidas depois de 6 meses do cadastro de cada peça no site. A data de quando cada peça pode ser devolvida aparece na área da fornecedora.",
  },
  {
    titulo: "6. Cuidados",
    texto:
      "A Salty cuida das peças com atenção. Em caso de avaria ou perda enquanto a peça estiver com a Salty, as duas partes combinam a solução.",
  },
];
