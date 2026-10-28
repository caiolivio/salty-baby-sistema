import type { Metadata } from "next";
import { ComoInstalarApp } from "@/componentes/como-instalar-app";
import { lerLoja } from "@/lib/loja/servidor";
import { videoParaIncorporar } from "@/lib/loja/regras";
import estilos from "../loja.module.css";
import proprios from "./instalar-app.module.css";

// Página pública com o vídeo (de Configurações) e o passo a passo de pôr a loja
// na tela inicial. O link dela vai nas mensagens de acesso das fornecedoras e clientes.

export async function generateMetadata(): Promise<Metadata> {
  const loja = await lerLoja();
  return { title: `Instale o app da ${loja.nomeCurto}` };
}

export default async function InstalarApp() {
  const loja = await lerLoja();
  const video = videoParaIncorporar(loja.videoInstalarApp);
  return (
    <article className={estilos.texto}>
      <h1 className={estilos.tituloPagina}>Instale o app da {loja.nomeCurto}</h1>
      <p>Com a loja na tela inicial, você abre o site com um toque, como um aplicativo. Não ocupa espaço e não precisa de loja de apps.</p>
      {video ? (
        <div className={proprios.video}>
          <iframe src={video} title="Vídeo: como instalar o app" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
        </div>
      ) : null}
      {loja.videoInstalarApp && (
        <p>
          <a href={loja.videoInstalarApp} target="_blank" rel="noopener noreferrer">
            {video ? "O vídeo não abriu? Assista por aqui" : "Assista ao vídeo de como instalar"}
          </a>
        </p>
      )}
      <ComoInstalarApp nome={loja.nomeCurto} />
    </article>
  );
}
