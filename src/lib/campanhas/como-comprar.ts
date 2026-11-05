// Passo a passo da página /como-comprar (e do PDF da campanha). Função pura.

export function passosDeCompra(d: { minutosReserva: number; mesesSacolinha: number; cupom: string | null }) {
  return [
    { titulo: "Crie a sua conta", texto: "Toque em Entrar > Criar conta. Leva um minuto: nome, e-mail, WhatsApp e uma senha." },
    { titulo: "Escolha as peças", texto: "Veja as fotos (toque para ampliar), o tamanho, a marca e o estado. Toque em \"Incluir no carrinho\"." },
    {
      titulo: "Use o seu cupom",
      texto: d.cupom
        ? `No carrinho, digite o cupom ${d.cupom} e toque em Usar. O desconto aparece na hora.`
        : "Tem um cupom? Digite no carrinho e toque em Usar. O desconto aparece na hora.",
    },
    {
      titulo: "Feche o pedido",
      texto: `Toque em "Fechar pedido". As peças ficam reservadas para você por ${d.minutosReserva} minutos e o WhatsApp da loja abre com a mensagem pronta. É só enviar.`,
    },
    { titulo: "Pague pelo WhatsApp", texto: "A loja confirma as peças e manda a chave Pix (ou combina outra forma de pagamento)." },
    {
      titulo: "Receba ou guarde na sacolinha",
      texto: `Escolha receber agora ou guardar as peças pagas na sacolinha por até ${d.mesesSacolinha} meses e juntar com as próximas compras. Depois desse prazo, as peças da sacolinha são doadas.`,
    },
  ];
}
