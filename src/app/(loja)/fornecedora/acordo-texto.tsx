import { TextoDaPagina } from "@/componentes/texto-da-pagina";
import { lerLoja } from "@/lib/loja/servidor";
import { paginaParaMostrar } from "@/lib/paginas/servidor";
import estilos from "../loja.module.css";

/** O acordo de consignação, com o texto de Painel > Páginas. */
export async function TextoDoAcordo() {
  const acordo = await paginaParaMostrar("contrato");
  return (
    <div className={estilos.acordo}>
      <strong>{acordo.titulo}</strong>
      <TextoDaPagina blocos={acordo.blocos} nivel={3} />
    </div>
  );
}

/** O que tem em cada parte da área (mostrado no "Parabéns"). */
export async function ComoFuncionaAArea() {
  const loja = await lerLoja();
  return (
    <ul className={estilos.listaPassos}>
      <li>
        <strong>Resumo:</strong> quanto você tem a receber, quanto pode receber com as peças que estão à venda e tudo o que
        já ganhou, com gráficos das suas vendas por semana, mês, ano ou datas que você escolher.
      </li>
      <li>
        <strong>Minhas peças:</strong> todas as suas peças, com o status de cada uma e a data de entrada. Ali você pede peças
        de volta, a partir de {loja.mesesDevolucao} meses da entrada.
      </li>
      <li>
        <strong>Vendas:</strong> cada peça vendida, quando, por quanto e quanto você recebe, e se o repasse já foi pago.
      </li>
      <li>
        <strong>Enviar peças:</strong> mande fotos de peças novas para a {loja.nomeCurto} avaliar.
      </li>
      <li>
        <strong>Meus dados:</strong> e-mail, endereço, WhatsApp, chave Pix e senha, além do acordo de consignação.
      </li>
    </ul>
  );
}
