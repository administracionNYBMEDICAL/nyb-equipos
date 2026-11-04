import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listClients, listEquipmentTypes, listSiteNames } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { EquipmentForm } from "./equipment-form";

export const metadata: Metadata = { title: "Nuevo equipo" };

const COMMON_TYPES = [
  "Respirador de Terapia",
  "Respirador de Transporte",
  "Monitor Multiparamétrico",
  "Desfibrilador",
  "Electrobisturí",
  "Incubadora",
  "Bomba de Infusión",
  "Bomba Jeringa",
  "Humidificador",
  "Electrocardiógrafo",
  "Aspirador",
];

export default async function NewEquipmentPage() {
  const staff = await requireStaff();
  const [clients, sites, types] = await Promise.all([
    listClients(staff.id),
    listSiteNames(staff.id),
    listEquipmentTypes(staff.id),
  ]);
  const allTypes = Array.from(new Set([...types, ...COMMON_TYPES])).sort((a, b) => a.localeCompare(b, "es"));
  return (
    <>
      <PageHeader eyebrow="Equipos" title="Nuevo equipo" />
      <EquipmentForm
        clients={clients.map((c) => c.name)}
        sites={Array.from(new Set(sites.map((s) => s.name)))}
        types={allTypes}
      />
    </>
  );
}
