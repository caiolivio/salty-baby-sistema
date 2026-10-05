import { PaginaDeTexto, tituloDaPagina } from "../pagina-de-texto";

export const generateMetadata = () => tituloDaPagina("contrato");

export default function AcordoDeConsignacao() {
  return <PaginaDeTexto chave="contrato" />;
}
