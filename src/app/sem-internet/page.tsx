import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Sem internet" };

// Mostrada pelo app instalado (public/sw.js) quando o celular está sem conexão.
export default function SemInternet() {
  return (
    <main style={{ maxWidth: 480, margin: "64px auto", padding: "0 16px", textAlign: "center" }}>
      <WifiOff className="icone" aria-hidden style={{ width: 40, height: 40, color: "var(--turquesa)" }} />
      <h1>Sem internet</h1>
      <p>Parece que o celular está sem conexão. Quando a internet voltar, toque abaixo para tentar de novo.</p>
      <p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- recarrega de verdade, para tentar a conexão */}
        <a href="/">Tentar de novo</a>
      </p>
    </main>
  );
}
