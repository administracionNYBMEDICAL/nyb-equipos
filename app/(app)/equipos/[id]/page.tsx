import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Printer, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getEquipment } from "@/lib/data";
import { qrSvg } from "@/lib/qr";
import { fmtDate } from "@/lib/format";
import { OPEN_REPAIR_STATUSES } from "@/lib/status";
import { Alert, ButtonLink, Card, PageHeader, StatusBadge } from "@/components/ui";
import { HistoryTimeline } from "@/components/history-timeline";
import { NoteForm, StatusForm } from "./equipment-actions";

export const metadata: Metadata = { title: "Hoja de vida" };

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
  const e = await getEquipment(staff.id, id);
  if (!e) notFound();
  const svg = await qrSvg(e.qr_token);
  const open = e.orders.find((o) => (OPEN_REPAIR_STATUSES as readonly string[]).includes(o.status));

  return (
    <>
      <PageHeader
        eyebrow={`Equipo ${e.code}`}
        title={e.equipment_type}
        actions={
          <>
            <ButtonLink href={`/equipos/${e.id}/etiqueta`} variant="accent">
              <Printer aria-hidden className="size-4" /> Imprimir etiqueta
            </ButtonLink>
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
          </>
        }
      >
        <p className="mt-1 text-muted">
          {[e.brand, e.model].filter(Boolean).join(" ") || "Sin marca ni modelo"} ·{" "}
          <span className="mono">{e.serial ?? "sin número de serie"}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge group="equipment" value={e.status} />
          {open && <StatusBadge group="repair" value={open.status} />}
        </div>
      </PageHeader>

      {sp.nuevo === "1" && (
        <div className="mb-5">
          <Alert tone="success">Equipo cargado con el código {e.code}. Imprimí la etiqueta y pegala en un lugar visible del equipo.</Alert>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-5">
            <h2 className="mb-2 text-lg font-semibold">Datos</h2>
            <dl>
              <Row label="Cliente">{e.client_name ?? "Equipo propio de NYB"}</Row>
              <Row label="Hospital / sector">{[e.site_name, e.sector].filter(Boolean).join(" · ") || "—"}</Row>
              <Row label="Nº de patrimonio">{e.asset_number ?? "—"}</Row>
              <Row label="Código UMDNS">{e.umdns_code ?? "—"}</Row>
              {e.status_reason && <Row label="Motivo del estado">{e.status_reason}</Row>}
              {e.notes && <Row label="Notas internas">{e.notes}</Row>}
              <Row label="Alta">{fmtDate(e.created_at)}</Row>
            </dl>
          </Card>

          <Card className="p-5">
            <p className="eyebrow">Hoja de vida</p>
            <h2 className="mb-4 text-lg font-semibold">Historial</h2>
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
            <div className="mt-6 border-t border-border pt-5">
              <NoteForm equipmentId={e.id} />
            </div>
          </Card>

          <Card>
            <h2 className="border-b border-border px-5 py-4 text-lg font-semibold">Ingresos al taller</h2>
            {e.orders.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">Este equipo todavía no pasó por el taller.</p>
            ) : (
              <ul className="divide-y divide-border">
                {e.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/taller/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface">
                      <span className="mono text-sm text-accent-strong">{o.number}</span>
                      <span className="text-sm text-muted">{fmtDate(o.received_at)}</span>
                      <span className="min-w-0 flex-1 text-sm">{o.reported_fault ?? "—"}</span>
                      <StatusBadge group="repair" value={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Código QR</h2>
            <div
              className="mx-auto w-40 [&_svg]:h-auto [&_svg]:w-full"
              role="img"
              aria-label={`Código QR del equipo ${e.code}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="mono mt-2 text-center">{e.code}</p>
            <Link
              href={`/q/${e.qr_token}?vista=cliente`}
              target="_blank"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-accent-strong"
            >
              Ver lo que ve el cliente <ExternalLink aria-hidden className="size-4" />
            </Link>
          </Card>
          <Card className="p-5">
            <StatusForm equipmentId={e.id} current={e.status} />
          </Card>
        </aside>
      </div>
    </>
  );
}
