import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { exigirPagina } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarData } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { formatarTelefone, lerTelefoneCliente, linkWhatsappCliente } from "@/lib/pedidos/regras";
import { podeAlterar, podeVer } from "@/lib/permissoes";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { BotoesExportar } from "../exportar/botoes";
import { Voltar, Seguir } from "@/componentes/voltar";

export const metadata: Metadata = { title: "Clientes" };

const POR_PAGINA = 100;

export default async function Clientes({ searchParams }: PageProps<"/painel/clientes">) {
  const usuario = await exigirPagina("clientes", "ver", "/painel/clientes");
  // Quanto cada cliente gastou: para quem também vê Vendas.
  const verGasto = podeVer(usuario.acesso, "vendas");
  const parametros = await searchParams;
  const busca = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const pagina = Math.max(1, Number(parametros.pagina) || 1);
  const digitos = busca.replace(/\D/g, "");

  const filtro: Prisma.ClienteWhereInput = busca
    ? {
        OR: [
          { nome: { contains: busca } },
          { email: { contains: busca } },
          { cidade: { contains: busca } },
          ...(digitos.length >= 4 ? [{ telefone: { contains: digitos } }] : []),
        ],
      }
    : {};
  const [total, clientes] = await Promise.all([
    prisma.cliente.count({ where: filtro }),
    prisma.cliente.findMany({
      where: filtro,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: { id: true, nome: true, telefone: true, cidade: true },
    }),
  ]);
  const compras = await prisma.venda.groupBy({
    by: ["clienteId"],
    where: { clienteId: { in: clientes.map((c) => c.id) } },
    _count: true,
    _sum: { totalCentavos: true },
    _max: { data: true },
  });
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) => `/painel/clientes?${new URLSearchParams({ ...(busca ? { q: busca } : {}), pagina: String(p) })}`;

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Clientes</h1>
        <span className={proprios.exportar}>
          <BotoesExportar tabela="clientes" />
          {podeAlterar(usuario.acesso, "clientes") && (
            <Link href="/painel/clientes/nova" className={proprios.botao}>
              <Plus className="icone" aria-hidden />
              Nova cliente
            </Link>
          )}
        </span>
      </div>
      <form className={estilos.busca} role="search">
        <input name="q" defaultValue={busca} placeholder="Nome, WhatsApp, e-mail ou cidade" aria-label="Buscar clientes" />
        <button type="submit">Buscar</button>
      </form>
      <p>
        {total} cliente(s){busca && ` encontradas para "${busca}"`}.
      </p>
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>WhatsApp</th>
              <th>Cidade</th>
              <th className={estilos.numero}>Compras</th>
              {verGasto && <th className={estilos.numero}>Total</th>}
              <th>Última compra</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const tel = lerTelefoneCliente(c.telefone);
              const dela = compras.find((v) => v.clienteId === c.id);
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/painel/clientes/${c.id}`}>{c.nome}</Link>
                  </td>
                  <td data-rotulo="WhatsApp">
                    {tel ? (
                      <a href={linkWhatsappCliente(tel)} target="_blank" rel="noopener noreferrer">
                        {formatarTelefone(tel)}
                      </a>
                    ) : (
                      c.telefone
                    )}
                  </td>
                  <td data-rotulo="Cidade">{c.cidade}</td>
                  <td className={estilos.numero} data-rotulo="Compras">
                    {dela?._count ?? 0}
                  </td>
                  {verGasto && (
                    <td className={estilos.numero} data-rotulo="Total">
                      {formatarReais(dela?._sum.totalCentavos ?? 0)}
                    </td>
                  )}
                  <td className={estilos.curta} data-rotulo="Última compra">
                    {dela?._max.data ? formatarData(dela._max.data) : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <nav className={estilos.paginas} aria-label="Páginas">
          {pagina > 1 && <Voltar href={link(pagina - 1)}>Anterior</Voltar>}
          <span>
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && <Seguir href={link(pagina + 1)}>Próxima</Seguir>}
        </nav>
      )}
    </>
  );
}
