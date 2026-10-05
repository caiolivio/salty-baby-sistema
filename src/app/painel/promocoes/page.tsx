import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirAcesso } from "@/lib/acesso";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import { descricaoDoDesconto, NOMES_SITUACAO, situacaoDaPromocao } from "@/lib/promocoes/regras";
import { listarPromocoes } from "@/lib/promocoes/servidor";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { BotoesExportar } from "../exportar/botoes";

export const metadata: Metadata = { title: "Promoções" };

const dataBr = (t: string) => t.split("-").reverse().join("/");
const COR_SITUACAO = { valendo: "publicada", programada: "reservada", encerrada: "vendida", pausada: "vendida" } as const;

// Promoções: peças escolhidas com desconto por um período. Só a administradora.
export default async function Promocoes() {
  await exigirAcesso("painel-administracao", "/painel/promocoes");
  const hoje = hojeEmSaoPaulo();
  const promocoes = await listarPromocoes();
  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Promoções</h1>
        <div className={proprios.acoes}>
          <BotoesExportar tabela="promocoes" />
          <Link href="/painel/promocoes/nova" className={proprios.botao}>
            <Plus className="icone" aria-hidden /> Nova promoção
          </Link>
        </div>
      </div>
      <p>
        Escolha peças, o desconto e o período. Enquanto a promoção vale, o site mostra o preço antigo riscado, o pedido já vem com o
        desconto e o post do WhatsApp sugere o grupo de liquidação.
      </p>
      {promocoes.length === 0 ? (
        <p>Nenhuma promoção criada ainda.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Promoção</th>
                <th>Desconto</th>
                <th>Período</th>
                <th className={estilos.numero}>Peças</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {promocoes.map((p) => {
                const s = situacaoDaPromocao(p, hoje);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/painel/promocoes/${p.id}`}>{p.nome}</Link>
                    </td>
                    <td>
                      {descricaoDoDesconto(p)}
                      {p.porContaDaLoja && <small> · por conta da loja</small>}
                    </td>
                    <td className={estilos.curta}>
                      {dataBr(p.inicio)} a {dataBr(p.fim)}
                    </td>
                    <td className={estilos.numero}>{p.pecas}</td>
                    <td>
                      <span className={estilos.selo} data-status={COR_SITUACAO[s]}>
                        {NOMES_SITUACAO[s]}
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
