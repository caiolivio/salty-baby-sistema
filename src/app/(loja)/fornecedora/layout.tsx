import Link from "next/link";
import { ArrowLeftRight, LogOut } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { podeAcessar } from "@/lib/permissoes";
import { situacaoNaArea } from "@/lib/fornecedoras/candidaturas";
import { etapaDaFornecedora } from "@/lib/fornecedoras/conta";
import estilos from "../loja.module.css";
import { AbasDaFornecedora } from "./abas";
import { sair } from "./acoes";

// Área da fornecedora: só quem tem o perfil de fornecedora. Cada página e ação confere de novo.
// As abas só aparecem depois que o cadastro está concluído.
export default async function LayoutFornecedora({ children }: LayoutProps<"/fornecedora">) {
  const usuario = await exigirAcesso("area-fornecedora", "/fornecedora");
  const situacao = await situacaoNaArea(usuario.id);
  const liberada = situacao.tipo === "fornecedora" && etapaDaFornecedora(situacao.fornecedora) === "liberada";
  return (
    <div className={estilos.paginaFornecedora}>
      <div className={estilos.cabecalhoArea}>
        <div>
          <p className="sobretitulo">Área da fornecedora{situacao.tipo === "fornecedora" && ` · ${situacao.fornecedora.codigo}`}</p>
          <p className={estilos.olaArea}>Olá, {usuario.nome.split(" ")[0]}!</p>
          {podeAcessar(usuario.perfis, "area-cliente") && (
            <Link href="/minha-conta" className={estilos.trocarArea}>
              <ArrowLeftRight className="icone" aria-hidden />
              Minhas compras e favoritos
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
      {liberada && <AbasDaFornecedora />}
      {children}
    </div>
  );
}
