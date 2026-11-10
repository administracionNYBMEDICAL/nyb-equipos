import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getEquipment, getEquipmentMaintenance, listEquipment } from "@/lib/data";
import { fmtDate, joinPlaces, todayAR } from "@/lib/format";
import { Alert, Button, ButtonLink, Card, EmptyState, Input, PageHeader, StatusBadge } from "@/components/ui";
import { PreventiveForm } from "./preventive-form";

export const metadata: Metadata = { title: "Registrar preventivo" };

export default async function NewPreventivePage({ searchParams }: PageProps<"/preventivos/nuevo">) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const equipmentId = typeof sp.equipo === "string" ? sp.equipo : "";
  const q = typeof sp.q === "string" ? sp.q : "";
  const ok = typeof sp.ok === "string" ? sp.ok : "";
  const okId = typeof sp.equipo_ok === "string" && /^[0-9a-f-]{36}$/i.test(sp.equipo_ok) ? sp.equipo_ok : "";

  const equipment = equipmentId ? await getEquipment(staff.id, equipmentId) : null;

  if (!equipment) {
    const results = q ? await listEquipment(staff.id, { q, limit: 20 }) : [];
    return (
      <>
        <PageHeader eyebrow="Preventivos" title="Registrar preventivo" />
        {ok && (
          <div className="mb-5">
            <Alert tone="success">
              Preventivo de {ok} guardado.{" "}
              {okId && (
                <Link href={`/equipos/${okId}?tab=preventivos`} className="font-semibold underline">Ver la ficha</Link>
              )}{" "}
              Si tenés más informes, buscá el próximo equipo.
            </Alert>
          </div>
        )}
        <Card className="p-5">
          <h2 className="mb-1 text-lg font-semibold">¿A qué equipo se le hizo?</h2>
          <p className="mb-4 text-sm text-muted">Buscalo por serial, código NYB o modelo. Si todavía no está cargado, cargalo como equipo nuevo.</p>
          <form action="/preventivos/nuevo" role="search" className="flex flex-wrap gap-2">
            <label htmlFor="q" className="sr-only">Buscar equipo</label>
            <div className="relative min-w-60 flex-1">
              <Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted" />
              <Input id="q" name="q" defaultValue={q} autoFocus placeholder="Serial, código NYB, modelo…" className="pl-9" />
            </div>
            <Button type="submit" variant="secondary">Buscar</Button>
            <ButtonLink href="/equipos/nuevo">Equipo nuevo</ButtonLink>
          </form>
          {q && (
            <div className="mt-5">
              {results.length === 0 ? (
                <EmptyState title="No lo encontramos" action={<ButtonLink href="/equipos/nuevo">Cargar equipo nuevo</ButtonLink>}>
                  No hay equipos que coincidan con “{q}”.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {results
                    .filter((e) => e.status !== "baja")
                    .map((e) => (
                      <li key={e.id}>
                        <Link href={`/preventivos/nuevo?equipo=${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface">
                          <span className="mono text-sm text-accent-strong">{e.code}</span>
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">{e.equipment_type}</span>
                            <span className="text-sm text-muted"> · {[e.brand, e.model].filter(Boolean).join(" ")} · <span className="mono">{e.serial ?? "sin número"}</span></span>
                            <span className="block text-xs text-muted">{joinPlaces(e.client_name, e.site_name, e.sector)}</span>
                          </span>
                          <StatusBadge group="equipment" value={e.status} />
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </>
    );
  }

  const m = await getEquipmentMaintenance(staff.id, equipment.id);
  return (
    <>
      <PageHeader eyebrow="Preventivos · registrar" title={equipment.equipment_type}>
        <p className="mt-1 text-muted">
          <span className="mono">{equipment.code}</span> · {[equipment.brand, equipment.model].filter(Boolean).join(" ")} ·{" "}
          <span className="mono">{equipment.serial ?? "sin número"}</span>
        </p>
        <p className="text-sm text-muted">{joinPlaces(equipment.client_name, equipment.site_name, equipment.sector)}</p>
        {m.runs[0] && (
          <p className="mt-1 text-sm text-muted">
            Último preventivo cargado: {fmtDate(m.runs[0].executed_on)}
            {m.plan && <> · próximo: {fmtDate(m.plan.next_due_on)}</>}
          </p>
        )}
      </PageHeader>
      {equipment.status === "baja" ? (
        <Alert>Este equipo está dado de baja: no se le pueden registrar preventivos.</Alert>
      ) : (
        <PreventiveForm equipmentId={equipment.id} today={todayAR()} defaultInterval={m.plan?.interval_months ?? 12} />
      )}
    </>
  );
}
