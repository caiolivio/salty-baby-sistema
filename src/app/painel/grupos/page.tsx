import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import { formatarReais } from "@/lib/dinheiro";
import { hojeEmSaoPaulo } from "@/lib/pecas/dados";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { EditarGrupo, NovoGrupo } from "./formularios";

export const metadata: Metadata = { title: "Grupos de WhatsApp · Salty Baby" };

type Soma = { vendas: number; totalCentavos: number };

function somar(vendas: { totalCentavos: number }[]): Soma {
  return { vendas: vendas.length, totalCentavos: vendas.reduce((s, v) => s + v.totalCentavos, 0) };
}

export default async function Grupos() {
  await exigirAcesso("painel-administracao", "/painel/grupos");
  const hoje = hojeEmSaoPaulo();
  const inicioDoMes = new Date(`${hoje.slice(0, 8)}01T00:00:00Z`);
  const [ano, mes] = hoje.split("-").map(Number);
  const inicioDoAno = new Date(Date.UTC(ano - 1, mes, 1));
  const [grupos, vendas] = await Promise.all([
    prisma.grupoWhatsapp.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.venda.findMany({
      where: { grupoId: { not: null }, data: { gte: inicioDoAno } },
      select: { grupoId: true, data: true, canal: true, totalCentavos: true },
    }),
  ]);

  return (
    <>
      <h1 className={estilos.titulo}>Grupos de WhatsApp</h1>
      <p>
        Na página de cada peça, o botão <strong>Divulgar no grupo</strong> sugere o grupo pela regra escolhida aqui e monta o
        texto com o link marcado. A compra feita por esse link conta para o grupo.
      </p>

      <h2>Vendas por grupo</h2>
      <p className={proprios.dica}>
        Contam as vendas registradas no painel com o grupo escolhido e os pedidos do site que vieram pelo link do post.
      </p>
      <div className={estilos.tabelaCaixa}>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Grupo</th>
              <th className={estilos.numero}>Este mês</th>
              <th className={estilos.numero}>Últimos 12 meses</th>
              <th className={estilos.numero}>Pelo link do post (12 meses)</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              const doGrupo = vendas.filter((v) => v.grupoId === g.id);
              const ano12 = somar(doGrupo);
              const mesAtual = somar(doGrupo.filter((v) => v.data >= inicioDoMes));
              const link = somar(doGrupo.filter((v) => v.canal === "site"));
              const texto = (s: Soma) => `${s.vendas} · ${formatarReais(s.totalCentavos)}`;
              return (
                <tr key={g.id}>
                  <td>{g.nome}</td>
                  <td className={estilos.numero} data-rotulo="Este mês">
                    {texto(mesAtual)}
                  </td>
                  <td className={estilos.numero} data-rotulo="Últimos 12 meses">
                    {texto(ano12)}
                  </td>
                  <td className={estilos.numero} data-rotulo="Pelo link do post">
                    {texto(link)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Lista de grupos</h2>
      <NovoGrupo />
      <section className={proprios.formulario} aria-label="Grupos cadastrados">
        {grupos.map((g) => (
          <EditarGrupo key={g.id} id={g.id} nome={g.nome} codigo={g.codigo} papel={g.papel} ativo={g.ativo} />
        ))}
      </section>
    </>
  );
}
