import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import { getPublicCard, equipmentIdForToken } from "@/lib/data";
import { getStaff } from "@/lib/auth";
import { fmtDate, todayAR } from "@/lib/format";
import { ArFlag, EcgLine, StatusBadge } from "@/components/ui";
import { HistoryTimeline } from "@/components/history-timeline";

export const metadata: Metadata = { title: "Ficha del equipo", robots: { index: false, follow: false } };

const PHONE = "+54 9 11 6299 3838";
const WHATSAPP = "5491162993838";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-surface">
      <div className="mx-auto max-w-[480px] bg-bg shadow-card">
        <header className="bg-brand px-5 pt-4 pb-1 text-on-brand">
          <div className="flex items-center gap-3">
            <Image src="/logo-nyb-192.png" alt="NYB Medical" width={40} height={40} className="size-10" priority />
            <div>
              <p className="font-semibold">NYB Medical</p>
              <p className="text-xs text-brand-muted">Servicio técnico de equipos médicos</p>
            </div>
          </div>
          <EcgLine className="mt-1 h-6" />
        </header>
        {children}
        <footer className="flex items-center justify-center gap-2 px-5 pt-2 pb-6 text-xs text-muted">
          <ArFlag /> nybmedical.com · {PHONE}
        </footer>
      </div>
    </main>
  );
}

export default async function PublicCardPage({ params, searchParams }: PageProps<"/q/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const card = await getPublicCard(token);

  if (!card) {
    return (
      <Shell>
        <div className="px-5 py-10 text-center">
          <h1 className="text-xl font-semibold">No encontramos este equipo</h1>
          <p className="mt-2 text-sm text-muted">
            El código puede estar dañado o el equipo fue dado de baja. Si necesitás ayuda, comunicate con NYB Medical.
          </p>
          <a href={`tel:${PHONE.replaceAll(" ", "")}`} className="mt-5 inline-flex h-12 items-center gap-2 rounded-md bg-brand px-5 font-semibold text-on-brand">
            <Phone aria-hidden className="size-4" /> Llamar a NYB
          </a>
        </div>
      </Shell>
    );
  }

  // Personal de NYB con sesión: acceso directo a la ficha completa.
  const staff = sp.vista === "cliente" ? null : await getStaff().catch(() => null);
  const internalId = staff ? await equipmentIdForToken(staff.id, token) : null;

  const today = todayAR();
  const due = card.next_due_on;
  const dueState = !due ? null : due < today ? "vencido" : due <= addDays(today, 14) ? "por_vencer" : "al_dia";
  const waText = encodeURIComponent(
    `Hola NYB, quiero reportar una falla del equipo ${card.code} (${card.type}${card.serial ? `, serie ${card.serial}` : ""}). `,
  );

  return (
    <Shell>
      {internalId && (
        <div className="flex items-center justify-between gap-3 bg-accent-soft px-5 py-2.5 text-sm">
          <span className="text-accent-strong">Estás con tu sesión de NYB.</span>
          <Link href={`/equipos/${internalId}`} className="font-semibold text-accent-strong underline">Ficha completa</Link>
        </div>
      )}
      <div className="px-5 py-5">
        <p className="eyebrow">Equipo {card.code}</p>
        <h1 className="mt-1 text-xl leading-7 font-bold">{card.type}</h1>
        <p className="text-sm text-muted">
          {[card.brand, card.model].filter(Boolean).join(" ")}
          {card.serial && (
            <>
              {" "}· <span className="mono">{card.serial}</span>
            </>
          )}
        </p>
        {(card.site || card.sector) && <p className="text-sm text-muted">{[card.site, card.sector].filter(Boolean).join(" · ")}</p>}
        <div className="mt-3">
          <StatusBadge group="equipment" value={card.status} />
        </div>
        {card.status === "en_taller" && (
          <p className="mt-3 rounded-md bg-info-soft px-3 py-2 text-sm text-info">Este equipo está en el taller de NYB Medical.</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-surface p-3">
            <p className="text-xs text-muted">Último servicio</p>
            <p className="text-sm font-semibold">{fmtDate(card.last_service_on)}</p>
          </div>
          <div className="rounded-md bg-surface p-3">
            <p className="text-xs text-muted">Próximo preventivo</p>
            <p className="text-sm font-semibold">{due ? fmtDate(due) : "Sin programar"}</p>
            {dueState && <StatusBadge group="maintenance" value={dueState} className="mt-1" />}
          </div>
        </div>

        <a
          href={`https://wa.me/${WHATSAPP}?text=${waText}`}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent text-base font-semibold text-on-accent"
        >
          <MessageCircle aria-hidden className="size-5" /> Reportar una falla
        </a>
        <a
          href={`tel:${PHONE.replaceAll(" ", "")}`}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-accent-strong"
        >
          <Phone aria-hidden className="size-4" /> Llamar a NYB
        </a>

        <h2 className="eyebrow mt-6 mb-3">Historial</h2>
        <HistoryTimeline
          items={card.history.map((h, i) => ({ key: String(i), type: h.type, summary: h.summary, at: h.at }))}
        />
      </div>
    </Shell>
  );
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
