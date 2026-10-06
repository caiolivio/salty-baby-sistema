"use client";

import { useEffect, useRef } from "react";

/** Ao trocar uma lista do formulário de busca, já mostra as peças (sem precisar do botão). */
export function EnviarAoMudar() {
  const marca = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const formulario = marca.current?.closest("form");
    if (!formulario) return;
    const aoMudar = (e: Event) => {
      if (e.target instanceof HTMLSelectElement) formulario.requestSubmit();
    };
    formulario.addEventListener("change", aoMudar);
    return () => formulario.removeEventListener("change", aoMudar);
  }, []);
  return <span ref={marca} hidden />;
}
