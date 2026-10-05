import { PaginaDeTexto, tituloDaPagina } from "../pagina-de-texto";

export const generateMetadata = () => tituloDaPagina("privacidade");

export default function Privacidade() {
  return <PaginaDeTexto chave="privacidade" />;
}
