import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { countEquipment, listClients, listEquipment } from "@/lib/data";
import { EQUIPMENT_STATUSES, statusLabel } from "@/lib/status";
import { fmtDate, joinPlaces } from "@/lib/format";
import { Button, ButtonLink, Card, EmptyState, Input, PageHeader, Select, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Equipos" };

export default async function EquiposPage({ searchParams }: PageProps<"/equipos">) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const clientId = typeof sp.cliente === "string" ? sp.cliente : "";
  const status = typeof sp.estado === "string" && (EQUIPMENT_STATUSES as readonly string[]).includes(sp.estado) ? sp.estado : "";
  const filtered = Boolean(q || clientId || status);

  const [rows, totals, clients] = await Promise.all([
    listEquipment(staff.id, { q, clientId: /^[0-9a-f-]{36}$/.test(clientId) ? clientId : undefined, status }),
    countEquipment(staff.id),
    listClients(staff.id),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Equipos"
        title={totals.total === 1 ? "1 equipo activo" : `${totals.total} equipos activos de ${totals.clients} ${totals.clients === 1 ? "cliente" : "clientes"}`}
        actions={<ButtonLink href="/equipos/nuevo">+ Nuevo equipo</ButtonLink>}
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search" action="/equipos">
        <label htmlFor="q" className="sr-only">Buscar</label>
        <div className="relative min-w-60 flex-[2]">
          <Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted" />
          <Input id="q" name="q" defaultValue={q} placeholder="Serial, presupuesto, código NYB, marca, modelo, hospital…" className="pl-9" />
        </div>
        <label htmlFor="cliente" className="sr-only">Cliente</label>
        <Select id="cliente" name="cliente" defaultValue={clientId} className="min-w-44 flex-1">
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <label htmlFor="estado" className="sr-only">Estado</label>
        <Select id="estado" name="estado" defaultValue={status} className="min-w-40 flex-1">
          <option value="">Todos los estados</option>
          {EQUIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel("equipment", s)}</option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">Filtrar</Button>
        {filtered && (
          <Link href="/equipos" className="inline-flex h-10 items-center px-2 text-sm font-semibold text-accent-strong">
            Limpiar
          </Link>
        )}
      </form>

      <Card>
        {rows.length === 0 ? (
          filtered ? (
            <EmptyState title="Ningún equipo coincide" action={<ButtonLink href="/equipos" variant="secondary">Limpiar filtros</ButtonLink>}>
              Probá con otra parte del serial o con el nombre del hospital.
            </EmptyState>
          ) : (
            <EmptyState title="Todavía no hay equipos cargados" action={<ButtonLink href="/equipos/nuevo">Cargar el primero</ButtonLink>}>
              Cada equipo que cargues recibe su código NYB y su etiqueta QR.
            </EmptyState>
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
                    <th scope="col" className="px-4 py-2.5 font-semibold">Serial</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Cliente / ubicación</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Estado</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Último movimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((e) => (
                    <tr key={e.id} className="align-top hover:bg-surface">
                      <td className="px-4 py-3">
                        <Link href={`/equipos/${e.id}`} className="mono text-accent-strong hover:underline">{e.code}</Link>
                      </td>
                      <td className="px-4 py-3">
                        {e.equipment_type}
                        <div className="text-xs text-muted">{[e.brand, e.model].filter(Boolean).join(" ") || "—"}</div>
                        {e.matched_budget && <div className="mono text-xs font-semibold text-accent-strong">Presup. {e.matched_budget}</div>}
                      </td>
                      <td className="mono px-4 py-3 break-all">{e.serial ?? <span className="font-sans text-muted">sin número</span>}</td>
                      <td className="px-4 py-3">
                        {e.client_name ?? "Propio NYB"}
                        <div className="text-xs text-muted">{[e.site_name, e.sector].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge group="equipment" value={e.status} />
                          {e.open_order_status && <StatusBadge group="repair" value={e.open_order_status} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{fmtDate(e.last_activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Celular */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map((e) => (
                <li key={e.id}>
                  <Link href={`/equipos/${e.id}`} className="flex flex-col gap-1 px-4 py-3 active:bg-surface">
                    <span className="flex items-center justify-between gap-2">
                      <span className="mono text-sm text-accent-strong">{e.code}</span>
                      <StatusBadge group="equipment" value={e.status} />
                    </span>
                    <span className="font-medium">{e.equipment_type}</span>
                    <span className="text-sm text-muted">
                      {[e.brand, e.model].filter(Boolean).join(" ")} · <span className="mono">{e.serial ?? "sin número"}</span>
                    </span>
                    <span className="text-sm text-muted">{joinPlaces(e.client_name, e.site_name, e.sector)}</span>
                    {e.matched_budget && <span className="mono text-sm font-semibold text-accent-strong">Presup. {e.matched_budget}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
