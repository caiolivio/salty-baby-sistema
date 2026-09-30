"use client";

export function BotaoImprimir({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
