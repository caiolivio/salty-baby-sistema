import { PaginaDeTexto, tituloDaPagina } from "../pagina-de-texto";

export const generateMetadata = () => tituloDaPagina("sobre");

export default function Sobre() {
  return <PaginaDeTexto chave="sobre" />;
}
