import Link from "next/link";
import { statusLabel, type EquipmentStatus } from "@/lib/status";

const ORDER: EquipmentStatus[] = ["operativo", "en_taller", "no_operativo", "faltante"];
const COLOR: Record<string, string> = {
  operativo: "var(--color-success)",
  en_taller: "var(--color-info)",
  no_operativo: "var(--color-danger)",
  faltante: "var(--color-violet)",
};

/** Dona del estado del parque (sin dados de baja). Cada segmento lleva su número y texto al lado: no depende solo del color. */
export function StatusDonut({ counts }: { counts: Partial<Record<EquipmentStatus, number>> }) {
  const items = ORDER.map((s) => ({ s, n: counts[s] ?? 0 }));
  const total = items.reduce((a, b) => a + b.n, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const operativos = total ? Math.round(((counts.operativo ?? 0) / total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 100 100" className="size-36 flex-none -rotate-90" role="img" aria-label={`${operativos}% de los equipos operativos`}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth="14" />
        {total > 0 &&
          items
            .filter((i) => i.n > 0)
            .map((i) => {
              const len = (i.n / total) * C;
              const el = (
                <circle
                  key={i.s}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke={COLOR[i.s]}
                  strokeWidth="14"
                  strokeDasharray={`${Math.max(len - 1, 0.5)} ${C}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        <text x="50" y="50" transform="rotate(90 50 50)" textAnchor="middle" dominantBaseline="central" className="fill-[var(--color-text)] text-[18px] font-bold">
          {total ? `${operativos}%` : "—"}
        </text>
      </svg>
      <ul className="flex min-w-40 flex-col gap-2 text-sm">
        {items.map((i) => (
          <li key={i.s}>
            <Link href={`/equipos?estado=${i.s}`} className="flex items-center gap-2 rounded-sm hover:underline">
              <span aria-hidden className="size-3 rounded-full" style={{ background: COLOR[i.s] }} />
              <span className="flex-1">{statusLabel("equipment", i.s)}</span>
              <span className="font-semibold tabular-nums">{i.n}</span>
            </Link>
          </li>
        ))}
        <li className="border-t border-border pt-2 text-muted">
          Total <span className="float-right font-semibold text-text tabular-nums">{total}</span>
        </li>
      </ul>
    </div>
  );
}
