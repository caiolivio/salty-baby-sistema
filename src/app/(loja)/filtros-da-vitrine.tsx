"use client";

import type { ReactNode } from "react";

/** Formulário dos filtros da vitrine: ao trocar uma lista, já mostra as peças (sem precisar do botão). */
export function FiltrosDaVitrine({ className, children }: { className: string; children: ReactNode }) {
  return (
    <form
      className={className}
      role="search"
      onChange={(e) => {
        if (e.target instanceof HTMLSelectElement) e.currentTarget.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
