import Link from "next/link";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listMaintenance, type MaintenanceRow } from "@/lib/data";
import { MAINTENANCE_STATES, type MaintenanceState } from "@/lib/status";
import { fmtDate, joinPlaces } from "@/lib/format";
import { ButtonLink, Card, EmptyState, PageHeader, StatusBadge, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Preventivos" };

const FILTER_LABEL: Record<MaintenanceState, string> = { vencido: "Vencidos", por_vencer: "Por vencer", al_dia: "Al día" };

function Result({ r }: { r: MaintenanceRow }) {
  if (!r.last_on) return <span className="text-muted">Sin registro</span>;
  return (
    <>
      {fmtDate(r.last_on)}
      <span className={cx("ml-2 text-xs font-semibold", r.last_passed ? "text-success" : "text-danger")}>
        {r.last_passed ? "Apto" : "NO apto"}
      </span>
      {r.last_report && <span className="mono block text-xs text-muted">Informe {r.last_report}</span>}
    </>
  );
}

export default async function PreventivosPage({ searchParams }: PageProps<"/preventivos">) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const filter = MAINTENANCE_STATES.find((s) => s === sp.estado) as MaintenanceState | undefined;
  const all = await listMaintenance(staff.id);
  const rows = filter ? all.filter((r) => r.due_state === filter) : all;
  const count = (s: MaintenanceState) => all.filter((r) => r.due_state === s).length;

  return (
    <>
      <PageHeader
        eyebrow="Preventivos"
        title="Mantenimientos preventivos"
        actions={<ButtonLink href="/preventivos/nuevo">+ Registrar preventivo</ButtonLink>}
      />

      {all.length > 0 && (
        <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
          {[{ id: undefined, label: `Todos (${all.length})` }, ...MAINTENANCE_STATES.map((s) => ({ id: s, label: `${FILTER_LABEL[s]} (${count(s)})` }))].map((f) => (
            <Link
              key={f.id ?? "todos"}
              href={f.id ? `/preventivos?estado=${f.id}` : "/preventivos"}
              aria-current={filter === f.id ? "page" : undefined}
              className={cx(
                "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold",
                filter === f.id ? "border-accent-strong bg-accent-soft text-accent-strong" : "border-border bg-bg text-muted hover:text-text",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      )}

      <Card>
        {rows.length === 0 ? (
          all.length === 0 ? (
            <EmptyState title="Todavía no hay preventivos cargados" action={<ButtonLink href="/preventivos/nuevo">Registrar el primero</ButtonLink>}>
              Cargá los preventivos ya realizados con su fecha, resultado e informe. La próxima revisión se calcula sola.
            </EmptyState>
          ) : (
            <EmptyState title="Ningún equipo en este estado" action={<ButtonLink href="/preventivos" variant="secondary">Ver todos</ButtonLink>} />
          )
        ) : (
          <>
            {/* Escritorio */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Código</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Equipo</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Cliente / ubicación</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Último preventivo</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Próximo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.equipment_id} className="align-top hover:bg-surface">
                      <td className="px-4 py-3">
                        <Link href={`/equipos/${r.equipment_id}?tab=preventivos`} className="mono text-accent-strong hover:underline">{r.code}</Link>
                      </td>
                      <td className="px-4 py-3">
                        {r.equipment_type}
                        <div className="text-xs text-muted">
                          {[r.brand, r.model].filter(Boolean).join(" ")} · <span className="mono">{r.serial ?? "sin número"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.client_name ?? "Propio NYB"}
                        <div className="text-xs text-muted">{joinPlaces(r.site_name, r.sector)}</div>
                      </td>
                      <td className="px-4 py-3"><Result r={r} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {fmtDate(r.next_due_on)}
                          <StatusBadge group="maintenance" value={r.due_state} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Celular */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map((r) => (
                <li key={r.equipment_id}>
                  <Link href={`/equipos/${r.equipment_id}?tab=preventivos`} className="flex flex-col gap-1 px-4 py-3 active:bg-surface">
                    <span className="flex items-center justify-between gap-2">
                      <span className="mono text-sm text-accent-strong">{r.code}</span>
                      <StatusBadge group="maintenance" value={r.due_state} />
                    </span>
                    <span className="font-medium">{r.equipment_type}</span>
                    <span className="text-sm text-muted">
                      {[r.brand, r.model].filter(Boolean).join(" ")} · <span className="mono">{r.serial ?? "sin número"}</span>
                    </span>
                    <span className="text-sm text-muted">{joinPlaces(r.client_name, r.site_name, r.sector)}</span>
                    <span className="text-sm">Próximo: <strong>{fmtDate(r.next_due_on)}</strong></span>
                    <span className="text-sm text-muted">Último: <Result r={r} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <p className="mt-3 text-sm text-muted">“Por vencer” son los que vencen en los próximos 14 días.</p>
    </>
  );
}
