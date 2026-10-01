import { exigirAcesso } from "@/lib/acesso";
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
      <div className={estilos.precoEEstrela}>
        <p className={estilos.ola}>
          Olá, {usuario.nome.split(" ")[0]}!{situacao.tipo === "fornecedora" && ` · ${situacao.fornecedora.codigo}`}
        </p>
        <form action={sair}>
          <button type="submit" className={estilos.sair}>
            Sair da conta
          </button>
        </form>
      </div>
      {liberada && <AbasDaFornecedora />}
      {children}
    </div>
  );
}
