import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { descricaoDoCupom } from "@/lib/cupons/regras";
import { listarCupons } from "@/lib/cupons/servidor";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { BotoesExportar } from "../exportar/botoes";

export const metadata: Metadata = { title: "Cupons" };

const dataBr = (t: string) => t.split("-").reverse().join("/");

function situacao(c: { ativo: boolean; inicio: string | null; fim: string | null; limiteUsos: number | null; usos: number }, hoje: string) {
  if (!c.ativo) return { nome: "Pausado", cor: "vendida" };
  if (c.inicio && hoje < c.inicio) return { nome: "Programado", cor: "reservada" };
  if (c.fim && hoje > c.fim) return { nome: "Vencido", cor: "vendida" };
  if (c.limiteUsos !== null && c.usos >= c.limiteUsos) return { nome: "Esgotado", cor: "vendida" };
  return { nome: "Valendo", cor: "publicada" };
}

// Cupons de desconto que a cliente digita no carrinho do site. Só a administradora.
export default async function Cupons() {
  await exigirAcesso("painel-administracao", "/painel/cupons");
  const hoje = hojeEmSaoPaulo();
  const cupons = await listarCupons();
  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Cupons</h1>
        <div className={proprios.acoes}>
          <BotoesExportar tabela="cupons" />
          <Link href="/painel/cupons/novo" className={proprios.botao}>
            <Plus className="icone" aria-hidden /> Novo cupom
          </Link>
        </div>
      </div>
      <p>A cliente digita o código no carrinho do site. O desconto já vem preenchido quando você confirma o pagamento do pedido.</p>
      {cupons.length === 0 ? (
        <p>Nenhum cupom criado ainda.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Desconto</th>
                <th>Validade</th>
                <th className={estilos.numero}>Usos</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((c) => {
                const s = situacao(c, hoje);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/painel/cupons/${c.id}`} className={estilos.codigo}>
                        {c.codigo}
                      </Link>
                    </td>
                    <td>
                      {descricaoDoCupom(c)}
                      {c.clienteId && <small> · só para uma cliente</small>}
                    </td>
                    <td className={estilos.curta}>
                      {c.inicio || c.fim ? `${c.inicio ? dataBr(c.inicio) : "já"} a ${c.fim ? dataBr(c.fim) : "sem fim"}` : "Sem prazo"}
                    </td>
                    <td className={estilos.numero}>
                      {c.usos}
                      {c.limiteUsos !== null && ` de ${c.limiteUsos}`}
                    </td>
                    <td>
                      <span className={estilos.selo} data-status={s.cor}>
                        {s.nome}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
