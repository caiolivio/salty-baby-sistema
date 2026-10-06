"use client";

import { useRef, useState, type FormEvent } from "react";

/** Nome do campo, pelo texto do rótulo (só o começo, sem as dicas de dentro). */
function nomeDoCampo(campo: EventTarget): string {
  if (!(campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement || campo instanceof HTMLSelectElement)) return "";
  const rotulo = campo.labels?.[0] ?? campo.closest("fieldset")?.querySelector("legend");
  const texto = rotulo?.firstChild?.textContent ?? "";
  return texto.trim();
}

/**
 * Aviso que aparece perto do botão de enviar quando falta preencher algo.
 * `aoFaltarCampo` vai no `onInvalidCapture` do formulário: o navegador avisa
 * no campo, e o aviso repete perto do botão.
 */
export function useAvisoDoEnvio() {
  const [aviso, setAviso] = useState<string | null>(null);
  // O navegador avisa de cada campo que falta, na ordem da tela: vale o primeiro.
  const avisando = useRef(false);
  function aoFaltarCampo(evento: FormEvent<HTMLFormElement>) {
    if (avisando.current) return;
    avisando.current = true;
    setTimeout(() => (avisando.current = false));
    const alvo = evento.target;
    if (alvo instanceof HTMLInputElement && alvo.type === "checkbox") return setAviso("Marque a caixinha acima para seguir.");
    const campo = nomeDoCampo(alvo);
    setAviso(campo ? `Preencha todos os dados. Falta: ${campo}.` : "Preencha todos os dados para seguir.");
  }
  return { aviso, setAviso, aoFaltarCampo };
}
