import type { NextConfig } from "next";

// App interna con login: todo se renderiza por pedido, así que no usamos
// Cache Components ni prefetch parcial (pensados para páginas públicas cacheables).
const nextConfig: NextConfig = {
  cacheComponents: false,
  // fotos (≈300 KB) y presupuestos en PDF (máx. 4 MB). Vercel corta los envíos a 4,5 MB.
  experimental: { serverActions: { bodySizeLimit: "4.4mb" } },
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
