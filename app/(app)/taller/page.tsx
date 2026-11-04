import Link from "next/link";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listOpenOrders } from "@/lib/data";
import { OPEN_REPAIR_STATUSES } from "@/lib/status";
import { daysSince } from "@/lib/format";
import { ButtonLink, EmptyState, PageHeader, StatusBadge, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Taller" };

export default async function TallerPage() {
  const staff = await requireStaff();
  const orders = await listOpenOrders(staff.id);
  return (
    <>
      <PageHeader
        eyebrow="Taller"
        title={orders.length === 1 ? "1 equipo en el taller" : `${orders.length} equipos en el taller`}
        actions={<ButtonLink href="/taller/nuevo">+ Nuevo ingreso</ButtonLink>}
      />
      {orders.length === 0 ? (
        <Card>
          <EmptyState title="El taller está vacío" action={<ButtonLink href="/taller/nuevo">Registrar un ingreso</ButtonLink>}>
            Cada equipo que entra genera una orden con su número, y queda anotado en su hoja de vida.
          </EmptyState>
        </Card>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          <div className="grid min-w-[880px] grid-cols-4 gap-3">
            {OPEN_REPAIR_STATUSES.map((st) => {
              const col = orders.filter((o) => o.status === st);
              return (
                <section key={st} aria-labelledby={`col-${st}`} className="flex flex-col gap-2.5 rounded-md bg-surface-2/60 p-2.5">
                  <h2 id={`col-${st}`} className="flex items-center justify-between px-1">
                    <StatusBadge group="repair" value={st} />
                    <span className="text-xs font-semibold text-muted">{col.length}</span>
                  </h2>
                  {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted">Nada en este estado</p>}
                  {col.map((o) => {
                    const days = daysSince(o.received_at);
                    return (
                      <Link
                        key={o.id}
                        href={`/taller/${o.id}`}
                        className="rounded-md border border-border bg-bg p-3 text-sm shadow-card transition-colors hover:border-accent-strong"
                      >
                        <span className="mb-1 flex justify-between gap-2 text-xs">
                          <span className="mono">{o.number}</span>
                          <span className={days > 15 ? "font-bold text-warning" : "text-muted"}>
                            {days === 1 ? "1 día" : `${days} días`}
                          </span>
                        </span>
                        <span className="block font-semibold">{o.equipment_type}</span>
                        <span className="block text-xs text-muted">{[o.brand, o.model].filter(Boolean).join(" ")}</span>
                        <span className="block text-xs text-muted">{[o.client_name, o.site_name].filter(Boolean).join(" · ")}</span>
                        {o.technician_name && (
                          <span className="mt-2 block text-xs font-semibold text-accent-strong">{o.technician_name}</span>
                        )}
                      </Link>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </div>
      )}
      <p className="mt-3 text-sm text-muted">Más de 15 días en el taller se marca en ámbar. Para mover una orden, abrila y cambiá su estado.</p>
    </>
  );
}
