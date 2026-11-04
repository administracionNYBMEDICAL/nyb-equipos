import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Preventivos" };

export default async function Page() {
  await requireStaff();
  return <ComingSoon eyebrow="Preventivos" title="Mantenimientos preventivos" items={["Plantillas de checklist (sí/no y valores numéricos con rango)", "Programar cada equipo con su periodicidad y responsable", "Vencidos y por vencer, con aviso diario por email", "Certificado de seguridad eléctrica en PDF"]} />;
}
