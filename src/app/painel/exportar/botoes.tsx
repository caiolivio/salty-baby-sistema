import { Download } from "lucide-react";
import proprios from "../formulario.module.css";

/** Botões para baixar a tabela inteira em Excel ou CSV. */
export function BotoesExportar({ tabela }: { tabela: string }) {
  return (
    <span className={proprios.exportar}>
      <a href={`/painel/exportar/${tabela}`} className={proprios.botaoSecundario} download>
        <Download className="icone" aria-hidden />
        Exportar Excel
      </a>
      <a href={`/painel/exportar/${tabela}?formato=csv`} className={proprios.link} download>
        CSV
      </a>
    </span>
  );
}
