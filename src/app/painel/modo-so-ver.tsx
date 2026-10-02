"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { Nivel, Pagina } from "@/lib/permissoes";
import estilos from "./formulario.module.css";

// Formulários de consulta continuam funcionando no "Só ver": busca e filtros
// (role="search" ou method="get") e os marcados com data-consulta.
const CONSULTA = "form[role=search], form[method=get], form[data-consulta]";

function travar(raiz: HTMLElement) {
  for (const form of raiz.querySelectorAll<HTMLFormElement>("form")) {
    if (form.matches(CONSULTA) || form.closest("header")) continue;
    for (const campo of form.querySelectorAll<HTMLElement>("input, select, textarea, button")) {
      if (campo.getAttribute("type") === "hidden") continue;
      campo.setAttribute("disabled", "");
    }
  }
}

/**
 * Suporte com "Só ver" nesta página: avisa e trava os botões e campos que
 * gravariam algo. É só para ficar claro na tela; quem bloqueia de verdade é o
 * servidor (exigirPagina com "alterar" em cada ação).
 */
export function ModoSoVer({ paginas }: { paginas: Partial<Record<Pagina, Nivel>> }) {
  const caminho = usePathname();
  const pagina = caminho.split("/")[2] as Pagina | undefined;
  const soVer = pagina !== undefined && paginas[pagina] === "ver";

  useEffect(() => {
    if (!soVer) return;
    const principal = document.querySelector<HTMLElement>("main");
    if (!principal) return;
    travar(principal);
    const observador = new MutationObserver(() => travar(principal));
    observador.observe(principal, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [soVer, caminho]);

  if (!soVer) return null;
  return (
    <p className={estilos.aviso} role="status">
      Você tem acesso só para ver esta página. Para mudar alguma coisa, peça à administradora.
    </p>
  );
}
