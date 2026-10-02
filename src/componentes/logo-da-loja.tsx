import { imagensDaLoja, lerLoja } from "@/lib/loja/servidor";

/**
 * Logo (ou ícone) da loja, das configurações. Usa <img> simples: a imagem pode
 * ter sido trocada no painel e ter outro formato, e o tamanho fica no CSS.
 */
export async function LogoDaLoja({
  tipo = "logo",
  className,
  alt,
  largura = 400,
  altura = 218,
}: {
  tipo?: "logo" | "icone";
  className?: string;
  /** Texto para quem não vê a imagem; vazio quando o nome já está ao lado. */
  alt?: string;
  largura?: number;
  altura?: number;
}) {
  const loja = await lerLoja();
  const imagens = imagensDaLoja(loja);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a imagem vem das configurações e pode mudar de formato
    <img
      src={imagens[tipo]}
      alt={alt ?? loja.nome}
      width={largura}
      height={altura}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
