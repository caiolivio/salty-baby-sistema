import Link from "next/link";
import { ArrowLeftRight, LogOut } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { podeAcessar } from "@/lib/permissoes";
import estilos from "../loja.module.css";
import { Abas } from "./abas";
import { sair } from "./acoes";

// Área do cliente: só quem tem o perfil de cliente. Cada página confere de novo.
export default async function LayoutMinhaConta({ children }: LayoutProps<"/minha-conta">) {
  const usuario = await exigirAcesso("area-cliente", "/minha-conta");
  return (
    <>
      <div className={estilos.cabecalhoArea}>
        <div>
          <p className="sobretitulo">Minha conta</p>
          <h1 className={estilos.olaArea}>Olá, {usuario.nome.split(" ")[0]}!</h1>
          {podeAcessar(usuario.perfis, "area-fornecedora") && (
            <Link href="/fornecedora" className={estilos.trocarArea}>
              <ArrowLeftRight className="icone" aria-hidden />
              Ir para a área da fornecedora
            </Link>
          )}
        </div>
        <form action={sair}>
          <button type="submit" className={estilos.sairIcone}>
            <LogOut className="icone" aria-hidden />
            Sair
          </button>
        </form>
      </div>
      <Abas />
      {children}
    </>
  );
}
