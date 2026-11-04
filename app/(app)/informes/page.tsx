import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Informes" };

export default async function Page() {
  await requireStaff();
  return <ComingSoon eyebrow="Informes" title="Informes" items={["Órdenes y preventivos por período y por cliente", "Exportar a Excel"]} />;
}
