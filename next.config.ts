import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    instantInsights: {
      // A área logada só renderiza no navegador, depois do refresh silencioso
      // (AuthContext); no servidor não há sessão nem conteúdo para pré-renderizar.
      // Por isso a validação de "navegação instantânea" do Next roda só em
      // segmentos que exportarem `instant` explicitamente; sem isso, o dev avisa
      // em toda página protegida que ela foi "descartada" da renderização.
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
