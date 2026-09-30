import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera uma pasta pronta para rodar na VPS sem instalar dependências lá.
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // As bases do Notion e as fotos das peças chegam em ações do servidor; o limite padrão é 1 MB.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
