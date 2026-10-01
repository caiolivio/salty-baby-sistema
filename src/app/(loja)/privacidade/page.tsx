import type { Metadata } from "next";
import estilos from "../loja.module.css";

export const metadata: Metadata = { title: "Aviso de privacidade · Salty Baby" };

// Aviso de privacidade do cadastro (LGPD). Texto simples, revisado pela loja.
export default function Privacidade() {
  return (
    <article className={estilos.texto}>
      <h1 className={estilos.tituloPagina}>Aviso de privacidade</h1>
      <p>
        A Salty Baby, brechó infantil de Caraguatatuba-SP, guarda os dados do seu cadastro só para atender você. Este aviso
        explica quais dados são esses e o que fazemos com eles.
      </p>
      <h2>Quais dados guardamos</h2>
      <ul>
        <li>Nome, e-mail e WhatsApp, que você informa ao criar a conta ou ao fazer um pedido.</li>
        <li>Suas compras, pedidos e as peças que você marca como favoritas.</li>
        <li>Se você quiser informar, dados das crianças (como idade e tamanho), para sugerir peças que sirvam.</li>
      </ul>
      <h2>Para que usamos</h2>
      <ul>
        <li>Combinar pagamento, envio ou retirada dos seus pedidos.</li>
        <li>Mostrar suas compras e favoritos na sua conta e sugerir peças do seu interesse.</li>
        <li>Avisar sobre novidades da loja pelo WhatsApp, se você quiser recebê-las.</li>
      </ul>
      <h2>Com quem compartilhamos</h2>
      <p>
        Com ninguém de fora da loja, a não ser quando for necessário para entregar sua compra (por exemplo, os Correios ou
        um entregador). Não vendemos seus dados.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode ver e corrigir seus dados na sua conta a qualquer momento. Para pedir uma cópia dos seus dados ou a
        exclusão do cadastro, fale com a loja pelo WhatsApp (12) 98105-3623.
      </p>
    </article>
  );
}
