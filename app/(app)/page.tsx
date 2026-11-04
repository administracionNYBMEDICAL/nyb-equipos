import Link from "next/link";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { dashboardStats, listOpenOrders } from "@/lib/data";
import { ButtonLink, Card, EcgLine, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { daysSince } from "@/lib/format";

export const metadata: Metadata = { title: "Panel" };

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "danger" | "warning" | "info" }) {
  const color = { danger: "text-danger", warning: "text-warning", info: "text-info" }[tone ?? "info"] ?? "";
  return (
    <Link href={href} className="rounded-md border border-border bg-bg p-4 transition-colors hover:border-accent-strong">
      <span className="text-sm text-muted">{label}</span>
      <span className={`block text-[28px] leading-[34px] font-bold ${tone ? color : "text-text"}`}>{value}</span>
    </Link>
  );
}

export default async function Dashboard() {
  const staff = await requireStaff();
  const [s, orders] = await Promise.all([dashboardStats(staff.id), listOpenOrders(staff.id)]);
  const oldest = orders.slice(0, 6);
  return (
    <>
      <PageHeader
        eyebrow="Panel"
        title={`Hola, ${staff.fullName.split(" ")[0]}`}
        actions={
          <>
            <ButtonLink href="/equipos/nuevo" variant="secondary">Nuevo equipo</ButtonLink>
            <ButtonLink href="/taller/nuevo">Nuevo ingreso</ButtonLink>
          </>
        }
      />
      <EcgLine className="-mt-2 mb-5 h-5 text-accent-strong/40" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="En taller" value={s.in_shop} href="/taller" tone="info" />
        <Stat label="Listos para entregar" value={s.ready} href="/taller" />
        <Stat label="Preventivos vencidos" value={s.overdue} href="/preventivos" tone="danger" />
        <Stat label="Reportes QR nuevos" value={s.new_tickets} href="/reportes" tone="warning" />
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Hace más tiempo en el taller</h2>
          <Link href="/taller" className="text-sm font-semibold text-accent-strong">Ver tablero</Link>
        </div>
        {oldest.length === 0 ? (
          <EmptyState title="No hay equipos en el taller">Cuando registres un ingreso, aparece acá.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {oldest.map((o) => {
              const days = daysSince(o.received_at);
              return (
                <li key={o.id}>
                  <Link href={`/taller/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface">
                    <span className="mono text-sm text-accent-strong">{o.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{o.equipment_type}</span>
                      <span className="text-sm text-muted"> · {[o.brand, o.model].filter(Boolean).join(" ")} · {o.client_name}</span>
                    </span>
                    <span className={`text-sm ${days > 15 ? "font-bold text-warning" : "text-muted"}`}>{days} días</span>
                    <StatusBadge group="repair" value={o.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
