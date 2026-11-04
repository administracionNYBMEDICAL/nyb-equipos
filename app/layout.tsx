import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Equipos · NYB Medical", template: "%s · NYB Medical" },
  description: "Gestión de equipos, taller y preventivos de NYB Medical",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0f2e3d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
