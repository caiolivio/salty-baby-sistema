"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, EllipsisVertical, MonitorDown, PlayCircle, Share } from "lucide-react";
import { aparelhoPeloNavegador } from "@/lib/pwa/regras";
import estilos from "./como-instalar-app.module.css";

type PedidoDeInstalacao = Event & { prompt: () => Promise<void> };

const nada = () => () => {};
const jaInstalado = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/**
 * Passo a passo para pôr o site na tela inicial (iPhone, Android e computador), mostrado
 * depois do cadastro da fornecedora. Abre o passo a passo do aparelho em uso e, quando o
 * navegador oferece, tem o botão que instala direto.
 */
export function ComoInstalarApp({ nome, linkDoVideo }: { nome: string; linkDoVideo?: string }) {
  const [pedido, setPedido] = useState<PedidoDeInstalacao | null>(null);
  const instalado = useSyncExternalStore(nada, jaInstalado, () => false);
  const aparelho = useSyncExternalStore(nada, () => aparelhoPeloNavegador(navigator.userAgent), () => "outro" as const);

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setPedido(e as PedidoDeInstalacao);
    };
    window.addEventListener("beforeinstallprompt", guardar);
    return () => window.removeEventListener("beforeinstallprompt", guardar);
  }, []);

  return (
    <section className={estilos.caixa} aria-labelledby="instalar-app">
      <h2 id="instalar-app">Coloque a {nome} na tela inicial</h2>
      {instalado ? (
        <p>Pronto: você já está usando a {nome} como aplicativo.</p>
      ) : (
        <>
          <p>Assim você abre a sua área com um toque, como um aplicativo, sem precisar procurar o site.</p>
          {linkDoVideo && (
            <p>
              <a href={linkDoVideo}>
                <PlayCircle className="icone" aria-hidden /> Prefere ver em vídeo? Assista aqui
              </a>
            </p>
          )}
          {pedido && (
            <button
              type="button"
              className={estilos.botao}
              onClick={async () => {
                await pedido.prompt();
                setPedido(null);
              }}
            >
              <Download className="icone" aria-hidden />
              Instalar agora
            </button>
          )}
          <details open={aparelho === "iphone"}>
            <summary>No iPhone</summary>
            <ol>
              <li>
                Se o site abriu dentro do WhatsApp ou do Instagram, toque nos três pontinhos ou na bússola e escolha{" "}
                <strong>Abrir no Safari</strong>.
              </li>
              <li>
                Toque em <Share className="icone" aria-label="Compartilhar" /> <strong>Compartilhar</strong>, na barra do Safari.
              </li>
              <li>
                Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.
              </li>
              <li>
                Toque em <strong>Adicionar</strong>. O ícone da {nome} aparece na tela do celular.
              </li>
            </ol>
          </details>
          <details open={aparelho === "android"}>
            <summary>No Android</summary>
            <ol>
              <li>
                Se o site abriu dentro do WhatsApp ou do Instagram, toque nos três pontinhos e escolha{" "}
                <strong>Abrir no Chrome</strong>.
              </li>
              <li>
                No Chrome, toque em <EllipsisVertical className="icone" aria-label="menu" /> (três pontinhos), no canto de cima.
              </li>
              <li>
                Toque em <strong>Instalar app</strong> (ou <strong>Adicionar à tela inicial</strong>) e confirme.
              </li>
            </ol>
          </details>
          <details open={aparelho === "outro"}>
            <summary>No computador</summary>
            <ol>
              <li>
                No Chrome ou no Edge, clique no ícone de instalar <MonitorDown className="icone" aria-label="instalar" />, no fim
                da barra de endereço, e depois em <strong>Instalar</strong>.
              </li>
              <li>
                No Mac com Safari: menu <strong>Arquivo</strong> e depois <strong>Adicionar ao Dock</strong>.
              </li>
            </ol>
          </details>
          <p className={estilos.dica}>
            Na primeira vez que abrir pelo ícone, entre de novo com o seu e-mail e a sua senha.
          </p>
        </>
      )}
    </section>
  );
}
