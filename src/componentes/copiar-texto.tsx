"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Botão que copia um texto (link ou mensagem) e mostra "Copiado". */
export function CopiarTexto({ texto, rotulo = "Copiar link", className }: { texto: string; rotulo?: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          window.prompt("Copie o texto:", texto);
        }
      }}
    >
      {copiado ? <Check className="icone" aria-hidden /> : <Copy className="icone" aria-hidden />}
      {copiado ? "Copiado" : rotulo}
    </button>
  );
}
