import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getEquipment, listClients, listEquipmentTypes, listSiteNames } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { EquipmentForm } from "../../nuevo/equipment-form";
import { updateEquipmentAction } from "../../actions";

export const metadata: Metadata = { title: "Editar equipo" };

export default async function EditEquipmentPage({ params }: PageProps<"/equipos/[id]/editar">) {
  const staff = await requireStaff();
  const { id } = await params;
  const [e, clients, sites, types] = await Promise.all([
    getEquipment(staff.id, id),
    listClients(staff.id),
    listSiteNames(staff.id),
    listEquipmentTypes(staff.id),
  ]);
  if (!e) notFound();
  const s = (v: string | null | undefined) => v ?? "";
  return (
    <>
      <PageHeader eyebrow={`Editar ${e.code}`} title={e.equipment_type} />
      <EquipmentForm
        mode="edit"
        action={updateEquipmentAction.bind(null, e.id)}
        cancelHref={`/equipos/${e.id}?tab=datos`}
        clients={clients.map((c) => c.name)}
        sites={Array.from(new Set(sites.map((x) => x.name)))}
        types={types}
        initial={{
          equipmentType: e.equipment_type,
          brand: s(e.brand),
          model: s(e.model),
          serial: s(e.serial),
          assetNumber: s(e.asset_number),
          umdnsCode: s(e.umdns_code),
          condition: s(e.condition),
          classification: s(e.classification),
          manufacturedOn: s(e.manufactured_on),
          purchasedOn: s(e.purchased_on),
          warrantyUntil: s(e.warranty_until),
          clientName: s(e.client_name),
          siteName: s(e.site_name),
          sector: s(e.sector),
          notes: s(e.notes),
        }}
      />
    </>
  );
}
