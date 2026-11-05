"use client";

import { useEffect, useState } from "react";
import { relogio } from "@/lib/campanhas/regras";

const dois = (n: number) => String(n).padStart(2, "0");

/**
 * Relógio da campanha ("1 dia 03:12:45"). Começa vazio e só mostra o tempo no
 * navegador, para a página do servidor não sair com uma hora diferente.
 */
export function ContagemRegressiva({ ate, className, acabou = "Encerrado" }: { ate: string; className?: string; acabou?: string }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    tique();
    const id = setInterval(tique, 1000);
    return () => clearInterval(id);
  }, []);
  if (agora === null) return <span className={className} aria-hidden />;
  const fim = new Date(ate);
  if (fim.getTime() <= agora) return <span className={className}>{acabou}</span>;
  const r = relogio(fim, new Date(agora));
  return (
    <span className={className} role="timer" aria-live="off">
      {r.dias > 0 && `${r.dias} ${r.dias === 1 ? "dia" : "dias"} `}
      {dois(r.horas)}:{dois(r.minutos)}:{dois(r.segundos)}
    </span>
  );
}
