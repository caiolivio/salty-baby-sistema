import Link from "next/link";
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
      <div className={estilos.precoEEstrela}>
        <h1 className={estilos.tituloPagina}>Olá, {usuario.nome.split(" ")[0]}!</h1>
        <form action={sair}>
          <button type="submit" className={estilos.sair}>
            Sair da conta
          </button>
        </form>
      </div>
      {podeAcessar(usuario.perfis, "area-fornecedora") && (
        <p>
          <Link href="/fornecedora">Ir para a área da fornecedora</Link>
        </p>
      )}
      <Abas />
      {children}
    </>
  );
}
