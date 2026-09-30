"use client";

import { useEffect } from "react";

/** Logo depois de fechar o pedido, abre o WhatsApp sozinho (o botão fica como reserva). */
export function AbrirWhatsapp({ link }: { link: string }) {
  useEffect(() => {
    const espera = setTimeout(() => {
      // Tira o "?novo=1" do endereço: ao voltar do WhatsApp, a página não abre de novo.
      window.history.replaceState(window.history.state, "", window.location.pathname);
      window.location.assign(link);
    }, 800);
    return () => clearTimeout(espera);
  }, [link]);
  return null;
}
