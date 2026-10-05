"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";
import { aparelhoPeloNavegador } from "@/lib/pwa/regras";

/** Liga o service worker (public/sw.js) do app instalável. Vai no layout raiz. */
export function RegistrarApp() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);
  return null;
}

type PedidoDeInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const nada = () => () => {};
const jaInstalado = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/**
 * "Instalar o app": no Android e no computador usa o pedido do próprio navegador;
 * no iPhone explica o caminho (Compartilhar > Adicionar à Tela de Início).
 * Some quando o site já está aberto como app.
 */
export function InstalarApp({ nome, className }: { nome: string; className?: string }) {
  const [pedido, setPedido] = useState<PedidoDeInstalacao | null>(null);
  const [ajuda, setAjuda] = useState(false);
  const instalado = useSyncExternalStore(nada, jaInstalado, () => true);
  const aparelho = useSyncExternalStore(nada, () => aparelhoPeloNavegador(navigator.userAgent), () => "outro" as const);

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setPedido(e as PedidoDeInstalacao);
    };
    window.addEventListener("beforeinstallprompt", guardar);
    return () => window.removeEventListener("beforeinstallprompt", guardar);
  }, []);

  if (instalado || (!pedido && aparelho !== "iphone")) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => {
          if (pedido) {
            await pedido.prompt();
            setPedido(null);
          } else setAjuda((a) => !a);
        }}
      >
        <Download className="icone" aria-hidden />
        Instalar o app {nome}
      </button>
      {ajuda && (
        <p role="status">
          No iPhone: toque em <Share className="icone" aria-label="Compartilhar" /> (Compartilhar), depois em{" "}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}
    </div>
  );
}
