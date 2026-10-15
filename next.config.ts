import type { NextConfig } from "next";

// Onde o servidor do Next encontra a API (não é exposto ao navegador).
const API_URL = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // O navegador chama /api/* na mesma origem do front (cookie de refresh HttpOnly,
  // SameSite=Strict, sem CORS) e o Next repassa para a API sem o prefixo /api:
  // /api/auth/login -> http://localhost:8000/auth/login.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
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
