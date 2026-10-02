"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Enquanto uma cópia está em andamento, atualiza a página a cada 5 segundos. */
export function AtualizarSozinho() {
  const router = useRouter();
  useEffect(() => {
    const relogio = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(relogio);
  }, [router]);
  return null;
}
