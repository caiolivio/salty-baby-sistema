import { PaginaDeTexto, tituloDaPagina } from "../pagina-de-texto";

export const generateMetadata = () => tituloDaPagina("termos");

export default function TermosDeUso() {
  return <PaginaDeTexto chave="termos" />;
}
