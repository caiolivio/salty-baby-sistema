"use client";

import jsQR from "jsqr";
import { useActionState, useEffect, useRef, useState } from "react";
import estilos from "../../formulario.module.css";
import { incluirNaVenda } from "./acoes";

type Detector = { detect(fonte: CanvasImageSource): Promise<{ rawValue: string }[]> };
type ClasseDetector = new (opcoes: { formats: string[] }) => Detector;

/**
 * Inclui peças na venda pelo código digitado ou lendo o QR da etiqueta com a
 * câmera. A câmera fica aberta para ler várias etiquetas seguidas.
 */
export function IncluirNaVenda() {
  const [estado, acao, enviando] = useActionState(incluirNaVenda, undefined);
  const [lendo, setLendo] = useState(false);
  const [problema, setProblema] = useState("");
  const formulario = useRef<HTMLFormElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!lendo) return;
    let parar = false;
    let fluxo: MediaStream | undefined;
    let ultimo = { texto: "", quando: 0 };
    const tela = document.createElement("canvas");
    const Nativo = (window as unknown as { BarcodeDetector?: ClasseDetector }).BarcodeDetector;
    const detector = Nativo ? new Nativo({ formats: ["qr_code"] }) : undefined;

    async function ler(): Promise<string | undefined> {
      const v = video.current;
      if (!v || v.readyState < 2) return;
      if (detector) {
        try {
          return (await detector.detect(v))[0]?.rawValue;
        } catch {
          // Alguns navegadores anunciam o detector mas falham: usa a leitura própria.
        }
      }
      tela.width = v.videoWidth;
      tela.height = v.videoHeight;
      const contexto = tela.getContext("2d", { willReadFrequently: true });
      if (!contexto || !tela.width) return;
      contexto.drawImage(v, 0, 0);
      const imagem = contexto.getImageData(0, 0, tela.width, tela.height);
      return jsQR(imagem.data, imagem.width, imagem.height)?.data;
    }

    async function repetir() {
      if (parar) return;
      const texto = await ler();
      const agora = Date.now();
      // Não lê a mesma etiqueta de novo logo em seguida.
      if (texto && (texto !== ultimo.texto || agora - ultimo.quando > 4000)) {
        ultimo = { texto, quando: agora };
        if (campo.current && formulario.current) {
          campo.current.value = texto;
          formulario.current.requestSubmit();
        }
        navigator.vibrate?.(80);
      }
      setTimeout(repetir, 250);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((f) => {
        fluxo = f;
        if (parar) return f.getTracks().forEach((t) => t.stop());
        if (video.current) {
          video.current.srcObject = f;
          void video.current.play();
        }
        repetir();
      })
      .catch(() => {
        setProblema("Não foi possível abrir a câmera. Confira se o navegador tem permissão para usá-la.");
        setLendo(false);
      });
    return () => {
      parar = true;
      fluxo?.getTracks().forEach((t) => t.stop());
    };
  }, [lendo]);

  return (
    <div className={estilos.formulario}>
      <form ref={formulario} action={acao} key={JSON.stringify(estado ?? null)}>
        {estado?.erro && (
          <p className={estilos.erro} role="alert">
            {estado.erro}
          </p>
        )}
        {estado?.ok && (
          <p className={estilos.aviso} role="status">
            {estado.ok}
          </p>
        )}
        <div className={estilos.grade}>
          <label className={estilos.campo}>
            Incluir peça pelo código
            <input
              ref={campo}
              name="codigo"
              defaultValue={estado?.codigo}
              placeholder="F06-00001"
              autoCapitalize="characters"
              required
            />
            <span className={estilos.dica}>O código novo, o antigo do Notion ou a leitura do QR da etiqueta.</span>
          </label>
        </div>
        <div className={estilos.acoes}>
          <button type="submit" className={estilos.botaoSecundario} disabled={enviando}>
            {enviando ? "Incluindo…" : "Incluir na venda"}
          </button>
          <button
            type="button"
            className={estilos.botaoSecundario}
            onClick={() => {
              if (!lendo && !navigator.mediaDevices) {
                setProblema("Este navegador não abre a câmera. Digite o código da etiqueta.");
                return;
              }
              setProblema("");
              setLendo(!lendo);
            }}
          >
            {lendo ? "Fechar a câmera" : "Ler QR da etiqueta"}
          </button>
        </div>
      </form>
      {problema && (
        <p className={estilos.erro} role="alert">
          {problema}
        </p>
      )}
      {lendo && (
        <video
          ref={video}
          muted
          playsInline
          style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#000" }}
          aria-label="Câmera lendo o QR da etiqueta"
        />
      )}
    </div>
  );
}
