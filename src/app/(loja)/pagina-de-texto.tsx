import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TextoDaPagina } from "@/componentes/texto-da-pagina";
import { paginaParaMostrar } from "@/lib/paginas/servidor";
import type { ChavePagina } from "@/lib/paginas/regras";
import estilos from "./loja.module.css";

// Páginas de texto que a loja edita em Painel > Páginas. Página fora do ar não abre.

export async function tituloDaPagina(chave: ChavePagina): Promise<Metadata> {
  const { titulo } = await paginaParaMostrar(chave);
  return { title: titulo };
}

export async function PaginaDeTexto({ chave }: { chave: ChavePagina }) {
  const pagina = await paginaParaMostrar(chave);
  if (!pagina.publicada) notFound();
  return (
    <article className={estilos.texto}>
      <h1 className={estilos.tituloPagina}>{pagina.titulo}</h1>
      <TextoDaPagina blocos={pagina.blocos} />
    </article>
  );
}
