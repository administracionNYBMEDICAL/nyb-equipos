import {
  Archive,
  ArrowRightLeft,
  ClipboardCheck,
  Eye,
  LogIn,
  LogOut,
  MapPin,
  MessageSquareWarning,
  PlusCircle,
  StickyNote,
  Wrench,
} from "lucide-react";
import { fmtDateTime } from "@/lib/format";

const ICONS: Record<string, typeof Wrench> = {
  alta: PlusCircle,
  edicion: ArrowRightLeft,
  estado: ArrowRightLeft,
  ubicacion: MapPin,
  ingreso: LogIn,
  orden_estado: Wrench,
  egreso: LogOut,
  nota: StickyNote,
  reporte_qr: MessageSquareWarning,
  preventivo: ClipboardCheck,
  prestamo: ArrowRightLeft,
  devolucion: ArrowRightLeft,
  baja: Archive,
};

export type TimelineItem = {
  key: string;
  type: string;
  summary: string;
  at: string | Date;
  by?: string;
  public?: boolean;
};

export function HistoryTimeline({ items, showVisibility }: { items: TimelineItem[]; showVisibility?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-muted">Sin movimientos todavía.</p>;
  return (
    <ol className="relative ml-2 border-l-2 border-border">
      {items.map((h) => {
        const Icon = ICONS[h.type] ?? StickyNote;
        return (
          <li key={h.key} className="relative pb-5 pl-6 last:pb-0">
            <span className="absolute top-0 -left-[13px] flex size-6 items-center justify-center rounded-full border-2 border-bg bg-accent-soft text-accent-strong">
              <Icon aria-hidden className="size-3.5" />
            </span>
            <p className="text-sm leading-5 break-words">{h.summary}</p>
            <p className="mt-0.5 text-xs text-muted">
              {fmtDateTime(h.at)}
              {h.by && <> · por {h.by}</>}
              {showVisibility && h.public && (
                <span className="ml-2 inline-flex items-center gap-1 text-accent-strong">
                  <Eye aria-hidden className="size-3" /> visible en el QR
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
