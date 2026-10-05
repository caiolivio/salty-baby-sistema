"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

// Erro inesperado numa página. O caso mais comum: a página ficou aberta
// enquanto o site era atualizado, e o botão de enviar ainda era da versão antiga.
export default function Erro({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main style={{ maxWidth: 480, margin: "64px auto", padding: "0 16px", textAlign: "center", display: "grid", gap: 12 }}>
      <RefreshCw className="icone" aria-hidden style={{ width: 40, height: 40, color: "var(--turquesa)" }} />
      <h1>Não deu para carregar</h1>
      <p>
        Pode ser que o site tenha sido atualizado enquanto a página estava aberta. Recarregue a página e
        tente de novo.
      </p>
      <p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: "var(--petroleo)",
            color: "#fff",
            border: 0,
            borderRadius: "var(--raio-p)",
            padding: "12px 20px",
            font: "inherit",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Recarregar a página
        </button>
      </p>
    </main>
  );
}
