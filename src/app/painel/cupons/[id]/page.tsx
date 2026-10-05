import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Voltar } from "@/componentes/voltar";
import { exigirAcesso } from "@/lib/acesso";
import { formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { lerCupomDoBanco } from "@/lib/cupons/servidor";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { apagarCupom } from "../acoes";
import { FormularioCupom } from "../formulario-cupom";
import { opcoesDoCupom } from "../opcoes";

export const metadata: Metadata = { title: "Cupom" };

const NOMES = { reservado: "Reservado", expirado: "Reserva vencida", cancelado: "Cancelado", pago: "Pago" } as const;
const reaisNoCampo = (centavos: number) => `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, "0")}`;

export default async function Cupom({ params, searchParams }: PageProps<"/painel/cupons/[id]">) {
  const { id } = await params;
  await exigirAcesso("painel-administracao", `/painel/cupons/${id}`);
  const [c, opcoes] = await Promise.all([lerCupomDoBanco(id), opcoesDoCupom()]);
  if (!c) notFound();
  const salvo = Boolean((await searchParams).salvo);

  return (
    <>
      <Voltar href="/painel/cupons">Cupons</Voltar>
      <h1 className={estilos.titulo}>Cupom {c.codigo}</h1>
      {salvo && <p className={proprios.aviso}>Cupom salvo.</p>}
      <FormularioCupom
        {...opcoes}
        iniciais={{
          id: c.id,
          codigo: c.codigo,
          tipo: c.tipo,
          valor: c.tipo === "reais" ? reaisNoCampo(c.valor) : String(c.valor / 100).replace(".", ","),
          inicio: c.inicio ?? "",
          fim: c.fim ?? "",
          limite: c.limiteUsos === null ? "" : String(c.limiteUsos),
          minimo: c.pedidoMinimoCentavos ? reaisNoCampo(c.pedidoMinimoCentavos) : "",
          quem: c.porContaDaLoja ? "loja" : "dividido",
          ativo: c.ativo ? "on" : "",
          clienteId: c.clienteId ?? "",
          marca: c.marca ?? "",
          tamanho: c.tamanho ?? "",
          genero: c.genero ?? "",
          fornecedoraId: c.fornecedoraId ?? "",
        }}
      />

      <h2>Pedidos com este cupom</h2>
      {c.pedidos.length === 0 ? (
        <p>Nenhum pedido usou este cupom ainda.</p>
      ) : (
        <div className={estilos.tabelaCaixa}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Feito em</th>
                <th>Situação</th>
                <th className={estilos.numero}>Desconto</th>
              </tr>
            </thead>
            <tbody>
              {c.pedidos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/painel/pedidos/${p.id}`}>nº {p.numero}</Link>
                  </td>
                  <td>{p.nomeCliente}</td>
                  <td className={estilos.curta}>{formatarDataHora(p.criadoEm)}</td>
                  <td>{NOMES[p.status]}</td>
                  <td className={estilos.numero}>{formatarReais(p.descontoCupomCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={proprios.zonaPerigo}>
        <form action={apagarCupom}>
          <input type="hidden" name="id" value={c.id} />
          <button type="submit" className={proprios.botaoPerigo}>
            Excluir cupom
          </button>
        </form>
        <p className={proprios.dica}>
          Os pedidos que já usaram o cupom guardam o código e o desconto. Para parar só por um tempo, desmarque “Cupom ativo”.
        </p>
      </div>
    </>
  );
}
