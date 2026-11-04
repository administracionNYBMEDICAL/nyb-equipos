import type { NextConfig } from "next";

// App interna con login: todo se renderiza por pedido, así que no usamos
// Cache Components ni prefetch parcial (pensados para páginas públicas cacheables).
const nextConfig: NextConfig = {
  cacheComponents: false,
  // fotos de equipos: se comprimen en el navegador (≈300 KB), 2 MB deja margen
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
