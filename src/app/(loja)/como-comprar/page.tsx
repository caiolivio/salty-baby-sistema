import type { Metadata } from "next";
import Link from "next/link";
import { lerLoja } from "@/lib/loja/servidor";
import { videoParaIncorporar } from "@/lib/loja/regras";
import { campanhaAtiva } from "@/lib/campanhas/servidor";
import { passosDeCompra } from "@/lib/campanhas/como-comprar";
import estilos from "../loja.module.css";
import proprios from "../instalar-app/instalar-app.module.css";

// Página pública "Como comprar": o passo a passo do site (com o vídeo de
// Configurações, se houver). O link vai nos posts da campanha e no rodapé.

export async function generateMetadata(): Promise<Metadata> {
  const loja = await lerLoja();
  return { title: `Como comprar na ${loja.nomeCurto}` };
}

export default async function ComoComprar() {
  const [loja, campanha] = await Promise.all([lerLoja(), campanhaAtiva()]);
  const video = videoParaIncorporar(loja.videoComoComprar);
  return (
    <article className={estilos.texto}>
      <h1 className={estilos.tituloPagina}>Como comprar na {loja.nomeCurto}</h1>
      <p>É rapidinho. Cada peça é única: quem fecha o pedido primeiro leva.</p>
      {video && (
        <div className={proprios.video}>
          <iframe src={video} title="Vídeo: como comprar no site" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
        </div>
      )}
      {loja.videoComoComprar && (
        <p>
          <a href={loja.videoComoComprar} target="_blank" rel="noopener noreferrer">
            {video ? "O vídeo não abriu? Assista por aqui" : "Assista ao vídeo de como comprar"}
          </a>
        </p>
      )}
      <ol className={estilos.passosCompra}>
        {passosDeCompra({ minutosReserva: loja.minutosReserva, mesesSacolinha: loja.mesesSacolinha, cupom: campanha?.cupom ?? null }).map((p) => (
          <li key={p.titulo}>
            <strong>{p.titulo}</strong>
            <span>{p.texto}</span>
          </li>
        ))}
      </ol>
      <p>
        <Link href={campanha ? `/c/${campanha.codigo}` : "/"} className={estilos.botaoWhats}>
          {campanha ? `Ver as peças da campanha ${campanha.nome}` : "Ver as peças"}
        </Link>
      </p>
      <p>
        Ficou alguma dúvida? <a href={`https://wa.me/${loja.whatsapp}`}>Fale com a gente no WhatsApp</a>. Quer abrir a loja com um toque?{" "}
        <Link href="/instalar-app">Instale o app</Link>.
      </p>
    </article>
  );
}
