import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Clientes" };

export default async function Page() {
  await requireStaff();
  return <ComingSoon eyebrow="Clientes" title="Clientes y hospitales" items={["Cada cliente con sus hospitales, sectores y parque de equipos", "Contacto y CUIT"]} />;
}
