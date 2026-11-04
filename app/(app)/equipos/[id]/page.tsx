import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Monitor, Pencil, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getEquipment } from "@/lib/data";
import { qrSvg } from "@/lib/qr";
import { fmtDate, joinPlaces } from "@/lib/format";
import { OPEN_REPAIR_STATUSES } from "@/lib/status";
import { Alert, ButtonLink, Card, StatusBadge, cx } from "@/components/ui";
import { HistoryTimeline } from "@/components/history-timeline";
import { NoteForm, StatusForm } from "./equipment-actions";
import { PhotoUploader } from "./photo-uploader";
import { QrPanel } from "./qr-panel";

export const metadata: Metadata = { title: "Hoja de vida" };

const TABS = [
  { id: "actividad", label: "Actividad" },
  { id: "taller", label: "Taller" },
  { id: "datos", label: "Datos" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const CONDITION: Record<string, string> = { propio: "Propio del hospital", comodato: "En comodato", alquiler: "Alquilado" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-0 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted sm:w-44 sm:flex-none">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

export default async function EquipmentPage({ params, searchParams }: PageProps<"/equipos/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "actividad";
  const e = await getEquipment(staff.id, id);
  if (!e) notFound();
  const svg = await qrSvg(e.qr_token);
  const open = e.orders.find((o) => (OPEN_REPAIR_STATUSES as readonly string[]).includes(o.status));
  const photoUrl = e.has_photo ? `/equipos/${e.id}/foto?v=${e.photo_version}` : null;

  return (
    <>
      {/* Encabezado */}
      <header className="mb-5 flex flex-wrap items-start gap-4">
        <div className="flex size-20 flex-none items-center justify-center overflow-hidden rounded-md border border-border bg-surface-2 sm:size-24">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto privada servida por la app, sin optimización
            <img src={photoUrl} alt={`Foto de ${e.equipment_type}`} className="size-full object-cover" />
          ) : (
            <Monitor aria-hidden className="size-8 text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <p className="eyebrow">Equipo {e.code}</p>
          <h1 className="mt-0.5 text-2xl leading-8 font-bold break-words sm:text-[28px] sm:leading-[34px]">{e.equipment_type}</h1>
          <p className="text-muted">
            {[e.brand, e.model].filter(Boolean).join(" ") || "Sin marca ni modelo"} ·{" "}
            <span className="mono">{e.serial ?? "sin número de serie"}</span>
          </p>
          <p className="text-sm text-muted">{joinPlaces(e.client_name ?? "Equipo propio de NYB", e.site_name, e.sector)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge group="equipment" value={e.status} />
            {open && <StatusBadge group="repair" value={open.status} />}
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {open ? (
            <ButtonLink href={`/taller/${open.id}`}>
              <Wrench aria-hidden className="size-4" /> Ver orden {open.number}
            </ButtonLink>
          ) : (
            e.status !== "baja" && (
              <ButtonLink href={`/taller/nuevo?equipo=${e.id}`}>
                <Wrench aria-hidden className="size-4" /> Registrar ingreso
              </ButtonLink>
            )
          )}
        </div>
      </header>

      {sp.nuevo === "1" && (
        <div className="mb-5">
          <Alert tone="success">Equipo cargado con el código {e.code}. Imprimí la etiqueta y pegala en un lugar visible del equipo.</Alert>
        </div>
      )}
      {sp.guardado === "1" && (
        <div className="mb-5">
          <Alert tone="success">Cambios guardados. Quedaron anotados en la actividad del equipo.</Alert>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* Pestañas */}
          <nav aria-label="Secciones del equipo" className="mb-4 flex gap-1 border-b border-border">
            {TABS.map((t) => {
              const count = t.id === "taller" ? e.orders.length : t.id === "actividad" ? e.history.length : 0;
              return (
                <Link
                  key={t.id}
                  href={`/equipos/${e.id}?tab=${t.id}`}
                  scroll={false}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={cx(
                    "-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold",
                    tab === t.id ? "border-accent-strong text-text" : "border-transparent text-muted hover:text-text",
                  )}
                >
                  {t.label}
                  {count > 0 && <span className="rounded-full bg-surface-2 px-1.5 text-xs text-muted">{count}</span>}
                </Link>
              );
            })}
          </nav>

          {tab === "actividad" && (
            <Card className="p-5">
              <NoteForm equipmentId={e.id} />
              <div className="mt-6 border-t border-border pt-5">
                <HistoryTimeline
                  showVisibility
                  items={e.history.map((h) => ({
                    key: h.id,
                    type: h.type,
                    summary: h.summary,
                    at: h.created_at,
                    by: h.created_by_name,
                    public: h.visible_on_qr,
                  }))}
                />
              </div>
            </Card>
          )}

          {tab === "taller" && (
            <Card>
              {e.orders.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">Este equipo todavía no pasó por el taller.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {e.orders.map((o) => (
                    <li key={o.id}>
                      <Link href={`/taller/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface">
                        <span className="mono text-sm text-accent-strong">{o.number}</span>
                        <span className="text-sm text-muted">
                          {fmtDate(o.received_at)}
                          {o.delivered_at && <> → {fmtDate(o.delivered_at)}</>}
                        </span>
                        <span className="min-w-0 flex-1 text-sm">{o.reported_fault ?? "—"}</span>
                        <StatusBadge group="repair" value={o.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === "datos" && (
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Datos del equipo</h2>
                <ButtonLink href={`/equipos/${e.id}/editar`} variant="secondary" size="sm">
                  <Pencil aria-hidden className="size-3.5" /> Editar
                </ButtonLink>
              </div>
              <dl>
                <Row label="Tipo">{e.equipment_type}</Row>
                <Row label="Marca / modelo">{[e.brand, e.model].filter(Boolean).join(" ") || "—"}</Row>
                <Row label="Serial"><span className="mono">{e.serial ?? "—"}</span></Row>
                <Row label="Cliente">{e.client_name ?? "Equipo propio de NYB"}</Row>
                <Row label="Hospital / sector">{joinPlaces(e.site_name, e.sector) || "—"}</Row>
                <Row label="Nº de patrimonio">{e.asset_number ?? "—"}</Row>
                <Row label="Condición">{e.condition ? CONDITION[e.condition] : "—"}</Row>
                <Row label="Clase de riesgo">{e.classification ?? "—"}</Row>
                <Row label="Código UMDNS">{e.umdns_code ?? "—"}</Row>
                <Row label="Fabricación">{fmtDate(e.manufactured_on)}</Row>
                <Row label="Compra">{fmtDate(e.purchased_on)}</Row>
                <Row label="Garantía hasta">{fmtDate(e.warranty_until)}</Row>
                {e.status_reason && <Row label="Motivo del estado">{e.status_reason}</Row>}
                {e.notes && <Row label="Notas internas">{e.notes}</Row>}
                <Row label="Alta">{fmtDate(e.created_at)}</Row>
              </dl>
              <div className="mt-4 border-t border-border pt-4">
                <PhotoUploader equipmentId={e.id} hasPhoto={e.has_photo} />
              </div>
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Código QR</h2>
            <QrPanel equipmentId={e.id} code={e.code} token={e.qr_token} svg={svg} />
          </Card>
          <Card className="p-5">
            <StatusForm equipmentId={e.id} current={e.status} />
          </Card>
        </aside>
      </div>
    </>
  );
}
