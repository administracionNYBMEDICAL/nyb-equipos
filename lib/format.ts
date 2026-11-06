const TZ = "America/Argentina/Buenos_Aires";

/** 2026-07-31 o Date → 31/07/2026 (hora de Argentina) */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }
  return new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(d),
  );
}

export function fmtDateTime(d: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d));
}

/** Hoy en Argentina como AAAA-MM-DD (para valores por defecto de inputs date). */
export function todayAR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Días completos entre una fecha AAAA-MM-DD y hoy en Argentina. */
export function daysSince(dateStr: string): number {
  const a = Date.parse(dateStr + "T00:00:00Z");
  const b = Date.parse(todayAR() + "T00:00:00Z");
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** centavos → "$ 100.000,00" */
export function fmtMoney(cents: number | string | null | undefined, currency = "ARS"): string {
  if (cents === null || cents === undefined) return "—";
  const n = Number(cents) / 100;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(n);
}

/** "100.000,50" o "$ 100.000" → centavos. null si está vacío; NaN si no es número. */
export function parseMoney(input: string | null | undefined): number | null {
  const s = (input ?? "").replace(/[^\d,.-]/g, "").trim();
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/\.(?=\d{3}(\D|$))/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** Une partes con " · " salteando vacías y repetidas (cliente = hospital, por ejemplo). */
export function joinPlaces(...parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  return parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .filter((p) => {
      const k = p.trim().toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join(" · ");
}

/** 320000 → "320 KB"; 1500000 → "1,5 MB" */
export function fmtBytes(n: number | string): string {
  const b = Number(n);
  if (b < 1_000_000) return `${Math.max(1, Math.round(b / 1000))} KB`;
  return `${(b / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}
