import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getRepairOrder, listStaff } from "@/lib/data";
import { daysSince, fmtDate, todayAR } from "@/lib/format";
import { Alert, Card, PageHeader, StatusBadge } from "@/components/ui";
import { OrderUpdateForm } from "./order-update-form";
import { IntakeForm } from "./intake-form";

export const metadata: Metadata = { title: "Orden de reparación" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-0 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted sm:w-40 sm:flex-none">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

export default async function OrderPage({ params, searchParams }: PageProps<"/taller/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const o = await getRepairOrder(staff.id, id);
  if (!o) notFound();
  const technicians = await listStaff(staff.id);
  const closed = ["entregado", "faltante", "sin_reparacion"].includes(o.status);

  return (
    <>
      <PageHeader eyebrow={`Orden ${o.number}`} title={o.equipment_type}>
        <p className="mt-1 text-muted">
          <Link href={`/equipos/${o.equipment_id}`} className="mono text-accent-strong hover:underline">{o.code}</Link> ·{" "}
          {[o.brand, o.model].filter(Boolean).join(" ")} · <span className="mono">{o.serial ?? "sin número"}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge group="repair" value={o.status} />
          {!closed && <span className="text-sm text-muted">{daysSince(o.received_at)} días en el taller</span>}
        </div>
      </PageHeader>

      {sp.nueva === "1" && (
        <div className="mb-5">
          <Alert tone="success">Ingreso registrado como {o.number}. Quedó anotado en la hoja de vida del equipo.</Alert>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card className="p-5">
          <h2 className="mb-2 text-lg font-semibold">Ingreso</h2>
          <dl>
            <Row label="Cliente">{o.client_name}</Row>
            <Row label="Hospital / sector">{[o.site_name, o.sector].filter(Boolean).join(" · ") || "—"}</Row>
            <Row label="Fecha de ingreso">{fmtDate(o.received_at)}</Row>
            <Row label="Remito de retiro">{o.pickup_remito ?? "—"}</Row>
            <Row label="Falla / motivo">{o.reported_fault ?? "—"}</Row>
            <Row label="Accesorios">{o.accessories_in ?? "—"}</Row>
            {o.source === "planilla" && <Row label="Origen">Importada de la planilla</Row>}
          </dl>
          <IntakeForm
            orderId={o.id}
            deliveredAt={o.delivered_at}
            today={todayAR()}
            initial={{
              receivedAt: o.received_at,
              pickupRemito: o.pickup_remito ?? "",
              accessoriesIn: o.accessories_in ?? "",
              reportedFault: o.reported_fault ?? "",
            }}
          />
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Estado y salida</h2>
          <OrderUpdateForm
            orderId={o.id}
            receivedAt={o.received_at}
            today={todayAR()}
            technicians={technicians}
            initial={{
              status: o.status,
              technicianId: o.technician_id ?? "",
              budgetNumber: o.budget_number ?? "",
              budgetDate: o.budget_date ?? "",
              budget: o.budget_cents ? (Number(o.budget_cents) / 100).toLocaleString("es-AR") : "",
              cost: o.cost_cents ? (Number(o.cost_cents) / 100).toLocaleString("es-AR") : "",
              deliveredAt: o.delivered_at ?? "",
              deliveryRemito: o.delivery_remito ?? "",
              comments: o.comments ?? "",
            }}
          />
        </Card>
      </div>
    </>
  );
}
