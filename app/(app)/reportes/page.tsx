import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Reportes QR" };

export default async function Page() {
  await requireStaff();
  return <ComingSoon eyebrow="Reportes QR" title="Reportes de clientes" items={["Formulario de falla al escanear el QR, sin cuenta", "Aviso inmediato por email a NYB", "Convertir un reporte en orden de taller con un clic"]} />;
}
