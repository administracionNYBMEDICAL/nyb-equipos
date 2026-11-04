import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Préstamos" };

export default async function Page() {
  await requireStaff();
  return <ComingSoon eyebrow="Préstamos" title="Equipos en préstamo" items={["Equipos propios de NYB prestados mientras se repara el del cliente", "A quién, desde cuándo y cuándo vuelve"]} />;
}
