import { exigirAcesso } from "@/lib/acesso";
import estilos from "../loja.module.css";
import { sair } from "./acoes";

// Área da fornecedora: só quem tem o perfil de fornecedora. Cada página e ação confere de novo.
export default async function LayoutFornecedora({ children }: LayoutProps<"/fornecedora">) {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  return (
    <div className={estilos.paginaFornecedora}>
      <div className={estilos.precoEEstrela}>
        <p className={estilos.ola}>Olá, {usuario.nome.split(" ")[0]}!</p>
        <form action={sair}>
          <button type="submit" className={estilos.sair}>
            Sair da conta
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
