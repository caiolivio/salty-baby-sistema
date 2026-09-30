import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera uma pasta pronta para rodar na VPS sem instalar dependências lá.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
