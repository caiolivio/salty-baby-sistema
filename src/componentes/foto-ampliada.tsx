"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import estilos from "./foto-ampliada.module.css";

export type FotoDaGaleria = { grande: string; miniatura: string; alt: string };

/**
 * Miniatura que, ao tocar, mostra a foto grande por cima da página, sem sair dela
 * (antes abria o arquivo em outra aba e, no celular, não tinha como voltar e o que
 * estava digitado se perdia). Fecha no X, tocando fora, com Esc ou com o voltar do
 * celular; as setas passam pelas outras fotos da lista.
 */
export function FotoAmpliada({ fotos, indice }: { fotos: FotoDaGaleria[]; indice: number }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [atual, setAtual] = useState(indice);
  const [aberta, setAberta] = useState(false);
  const foto = fotos[atual] ?? fotos[indice];

  // O voltar do celular fecha a foto em vez de sair da página.
  useEffect(() => {
    if (!aberta) return;
    history.pushState({ fotoAmpliada: true }, "");
    const voltar = () => setAberta(false);
    window.addEventListener("popstate", voltar);
    return () => {
      window.removeEventListener("popstate", voltar);
      if (history.state?.fotoAmpliada) history.back();
    };
  }, [aberta]);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);

  const passar = (passo: number) => setAtual((i) => (i + passo + fotos.length) % fotos.length);

  return (
    <>
      <button
        type="button"
        className={estilos.miniatura}
        onClick={() => {
          setAtual(indice);
          setAberta(true);
        }}
        aria-label={`Ver ${fotos[indice].alt} maior`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura já reduzida no envio */}
        <img src={fotos[indice].miniatura} alt={fotos[indice].alt} />
      </button>
      <dialog
        ref={dialogo}
        className={estilos.dialogo}
        aria-label={foto.alt}
        onClose={() => setAberta(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAberta(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") passar(-1);
          if (e.key === "ArrowRight") passar(1);
        }}
      >
        {aberta && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto do envio, já no tamanho de tela */}
            <img src={foto.grande} alt={foto.alt} className={estilos.grande} />
            <button type="button" className={estilos.fechar} onClick={() => setAberta(false)} aria-label="Fechar a foto">
              <X className="icone" aria-hidden />
            </button>
            {fotos.length > 1 && (
              <>
                <button type="button" className={`${estilos.seta} ${estilos.antes}`} onClick={() => passar(-1)} aria-label="Foto anterior">
                  <ChevronLeft className="icone" aria-hidden />
                </button>
                <button type="button" className={`${estilos.seta} ${estilos.depois}`} onClick={() => passar(1)} aria-label="Próxima foto">
                  <ChevronRight className="icone" aria-hidden />
                </button>
                <span className={estilos.contador}>
                  {atual + 1} de {fotos.length}
                </span>
              </>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
