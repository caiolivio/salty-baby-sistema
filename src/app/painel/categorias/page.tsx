import type { Metadata } from "next";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import proprios from "../formulario.module.css";
import estilos from "../painel.module.css";
import { EditarCategoria, NovaCategoria } from "./formularios";
import { BotoesExportar } from "../exportar/botoes";

export const metadata: Metadata = { title: "Categorias · Salty Baby" };

export default async function Categorias() {
  await exigirAcesso("painel-administracao", "/painel/categorias");
  const categorias = await prisma.categoria.findMany({
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    include: { _count: { select: { pecas: true } } },
  });

  return (
    <>
      <div className={proprios.cabecalho}>
        <h1 className={estilos.titulo}>Categorias</h1>
        <BotoesExportar tabela="categorias" />
      </div>
      <p>
        No cadastro da peça dá para marcar uma ou mais categorias desta lista. Uma categoria que não é mais usada pode ser
        tirada do cadastro sem sumir das peças que já a têm.
      </p>
      <NovaCategoria />
      <section className={proprios.formulario} aria-label="Categorias cadastradas">
        {categorias.map((c) => (
          <EditarCategoria key={c.id} id={c.id} nome={c.nome} ativa={c.ativa} pecas={c._count.pecas} />
        ))}
      </section>
    </>
  );
}
