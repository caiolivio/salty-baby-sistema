import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcesso } from "@/lib/acesso";
import { formatarData } from "@/lib/datas";
import { prisma } from "@/lib/banco";
import { NO_AR_SEM_SALVAR, PAGINAS_EDITAVEIS } from "@/lib/paginas/regras";
import estilos from "../painel.module.css";
import proprio from "./paginas.module.css";

export const metadata: Metadata = { title: "Páginas" };

export default async function Paginas() {
  await exigirAcesso("painel-administracao", "/painel/paginas");
  const salvas = await prisma.pagina.findMany({ select: { chave: true, publicada: true, versao: true, atualizadoEm: true } });
  return (
    <>
      <h1 className={estilos.titulo}>Páginas</h1>
      <p>Textos do site que você mesma escreve e muda quando quiser. As páginas no ar aparecem no rodapé do site.</p>
      <ul className={proprio.cartoes}>
        {PAGINAS_EDITAVEIS.map((p) => {
          const s = salvas.find((x) => x.chave === p.chave);
          const noAr = s ? s.publicada : NO_AR_SEM_SALVAR.includes(p.chave);
          return (
            <li key={p.chave}>
              <Link href={`/painel/paginas/${p.chave}`}>
                <strong>{p.nome}</strong>
                <span>{p.explica}</span>
                <span className={proprio.situacao}>
                  {noAr ? "No ar" : "Fora do ar"} ·{" "}
                  {s ? `versão ${s.versao}, de ${formatarData(s.atualizadoEm)}` : "texto inicial, ainda não revisado"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
