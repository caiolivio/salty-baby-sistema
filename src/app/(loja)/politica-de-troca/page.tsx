import { PaginaDeTexto, tituloDaPagina } from "../pagina-de-texto";

export const generateMetadata = () => tituloDaPagina("trocas");

export default function PoliticaDeTroca() {
  return <PaginaDeTexto chave="trocas" />;
}
