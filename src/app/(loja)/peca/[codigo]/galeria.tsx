"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as EventoPonteiro } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { ampliarEm, limitar, origemDaLupa, SEM_ZOOM, toqueDuplo, type Enquadramento } from "@/lib/zoom";
import estilos from "./galeria.module.css";

type Foto = { id: string; grande: string; miniatura: string; alt: string };

/**
 * Fotos da peça no site (pedido do Caio, 05/11/2026): tocar na foto abre em
 * tela cheia, com zoom de dois dedos ou dois toques e arrastar para passar de
 * foto. O voltar do celular fecha a foto sem sair da peça. No computador, o
 * mouse sobre a foto mostra o detalhe ampliado.
 */
export function GaleriaDaPeca({ fotos }: { fotos: Foto[] }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const [lupa, setLupa] = useState<{ indice: number; origem: string } | null>(null);
  const fechar = useCallback(() => setAberta(null), []);

  return (
    <>
      <div className={estilos.fotosGrandes}>
        {fotos.map((foto, i) => (
          <button
            key={foto.id}
            id={`foto-${i + 1}`}
            type="button"
            className={estilos.fotoBotao}
            onClick={() => {
              setLupa(null);
              setAberta(i);
            }}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setLupa({ indice: i, origem: origemDaLupa(e.clientX - r.left, e.clientY - r.top, r.width, r.height) });
            }}
            onMouseLeave={() => setLupa(null)}
            aria-label={`Ampliar ${foto.alt}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- fotos já reduzidas no envio */}
            <img
              src={foto.grande}
              alt={foto.alt}
              className={lupa?.indice === i ? estilos.comLupa : undefined}
              style={lupa?.indice === i ? { transformOrigin: lupa.origem } : undefined}
            />
            <span className={estilos.dicaZoom} aria-hidden>
              <ZoomIn className="icone" />
            </span>
          </button>
        ))}
      </div>
      {fotos.length > 1 && (
        <nav className={estilos.miniaturas} aria-label="Fotos">
          {fotos.map((foto, i) => (
            <a key={foto.id} href={`#foto-${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
              <img src={foto.miniatura} alt={`Ver foto ${i + 1}`} />
            </a>
          ))}
        </nav>
      )}
      {aberta !== null && <TelaCheia fotos={fotos} inicial={aberta} fechar={fechar} />}
    </>
  );
}

function TelaCheia({ fotos, inicial, fechar }: { fotos: Foto[]; inicial: number; fechar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(inicial);
  const [enq, setEnq] = useState<Enquadramento>(SEM_ZOOM);
  const toques = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ dist: number; enq: Enquadramento; cx: number; cy: number } | null>(null);
  const arrasto = useRef<{ x: number; y: number; enq: Enquadramento } | null>(null);
  const ultimoToque = useRef(0);
  const foto = fotos[atual];

  // Abre por cima da página; o voltar do celular fecha a foto em vez de sair da peça.
  useEffect(() => {
    dialogo.current?.showModal();
    history.pushState({ fotoAmpliada: true }, "");
    const voltar = () => fechar();
    window.addEventListener("popstate", voltar);
    return () => {
      window.removeEventListener("popstate", voltar);
      if (history.state?.fotoAmpliada) history.back();
    };
  }, [fechar]);

  const passar = (passo: number) => {
    setEnq(SEM_ZOOM);
    setAtual((i) => (i + passo + fotos.length) % fotos.length);
  };

  const medidas = () => {
    const r = area.current?.getBoundingClientRect();
    return r ?? { left: 0, top: 0, width: 1, height: 1 };
  };
  const relativo = (x: number, y: number) => {
    const r = medidas();
    return { px: x - r.left - r.width / 2, py: y - r.top - r.height / 2, w: r.width, h: r.height };
  };

  const descer = (e: EventoPonteiro<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.current.size === 2) {
      const [a, b] = [...toques.current.values()];
      const { px, py } = relativo((a.x + b.x) / 2, (a.y + b.y) / 2);
      gesto.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), enq, cx: px, cy: py };
      arrasto.current = null;
    } else if (toques.current.size === 1) {
      arrasto.current = { x: e.clientX, y: e.clientY, enq };
    }
  };

  const mover = (e: EventoPonteiro<HTMLDivElement>) => {
    if (!toques.current.has(e.pointerId)) return;
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const { w, h } = relativo(0, 0);
    if (toques.current.size === 2 && gesto.current) {
      const [a, b] = [...toques.current.values()];
      const g = gesto.current;
      const escala = (g.enq.escala * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, g.dist);
      setEnq(ampliarEm(g.enq, escala, g.cx, g.cy, w, h));
    } else if (arrasto.current && arrasto.current.enq.escala > 1) {
      const d = arrasto.current;
      setEnq(limitar({ ...d.enq, x: d.enq.x + e.clientX - d.x, y: d.enq.y + e.clientY - d.y }, w, h));
    }
  };

  const subir = (e: EventoPonteiro<HTMLDivElement>) => {
    const inicio = arrasto.current;
    toques.current.delete(e.pointerId);
    if (toques.current.size < 2) gesto.current = null;
    if (toques.current.size > 0 || !inicio) {
      arrasto.current = null;
      return;
    }
    arrasto.current = null;
    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;
    // Sem zoom: arrastar para o lado passa de foto.
    if (inicio.enq.escala === 1 && fotos.length > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      passar(dx < 0 ? 1 : -1);
      return;
    }
    // Toque rápido duas vezes: amplia ou volta.
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const agora = Date.now();
      if (agora - ultimoToque.current < 300) {
        const { px, py, w, h } = relativo(e.clientX, e.clientY);
        setEnq((atualEnq) => toqueDuplo(atualEnq, px, py, w, h));
        ultimoToque.current = 0;
      } else {
        ultimoToque.current = agora;
      }
    }
  };

  return (
    <dialog
      ref={dialogo}
      className={estilos.dialogo}
      aria-label={foto.alt}
      onClose={fechar}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") passar(-1);
        if (e.key === "ArrowRight") passar(1);
      }}
    >
      <div
        ref={area}
        className={estilos.area}
        onPointerDown={descer}
        onPointerMove={mover}
        onPointerUp={subir}
        onPointerCancel={subir}
        onWheel={(e) => {
          const { px, py, w, h } = relativo(e.clientX, e.clientY);
          setEnq((atualEnq) => ampliarEm(atualEnq, atualEnq.escala * (e.deltaY < 0 ? 1.2 : 1 / 1.2), px, py, w, h));
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- foto do envio, já no tamanho de tela */}
        <img
          src={foto.grande}
          alt={foto.alt}
          className={estilos.grande}
          draggable={false}
          style={{ transform: `translate(${enq.x}px, ${enq.y}px) scale(${enq.escala})` }}
        />
      </div>
      <button type="button" className={estilos.fechar} onClick={fechar} aria-label="Fechar a foto">
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
        </>
      )}
      <span className={estilos.contador}>
        {fotos.length > 1 ? `${atual + 1} de ${fotos.length} · ` : ""}
        {enq.escala > 1 ? "toque duas vezes para voltar" : "dois toques ou dois dedos para ampliar"}
      </span>
    </dialog>
  );
}
