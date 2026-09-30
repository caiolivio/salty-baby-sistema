import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { prisma } from "@/lib/banco";
import proprios from "../../formulario.module.css";
import estilos from "../../painel.module.css";
import { EditarGrupo, NovoGrupo } from "./formularios";

export const metadata: Metadata = { title: "Grupos de WhatsApp · Salty Baby" };

export default async function Grupos() {
  await exigirAcesso("painel-administracao", "/painel/marketing/grupos");
  const grupos = await prisma.grupoWhatsapp.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] });

  return (
    <>
      <p>
        <Link href="/painel/marketing">← WhatsApp Marketing</Link>
      </p>
      <h1 className={estilos.titulo}>Grupos de WhatsApp</h1>
      <p>
        A regra de cada grupo decide para quais peças ele é sugerido. A marca no link não muda quando o nome muda, para os
        posts antigos continuarem contando para o grupo.
      </p>
      <NovoGrupo />
      <section className={proprios.formulario} aria-label="Grupos cadastrados">
        {grupos.map((g) => (
          <EditarGrupo key={g.id} id={g.id} nome={g.nome} codigo={g.codigo} papel={g.papel} ativo={g.ativo} />
        ))}
      </section>
    </>
  );
}
