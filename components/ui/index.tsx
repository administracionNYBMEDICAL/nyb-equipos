import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { statusLabel, type StatusGroup } from "@/lib/status";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---------- Button ----------
type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  accent: "bg-accent text-on-accent hover:brightness-95",
  secondary: "bg-bg text-text border border-border hover:bg-surface",
  ghost: "bg-transparent text-accent-strong hover:bg-accent-soft",
  danger: "bg-danger text-white hover:brightness-95",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-base" };
export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    extra,
  );
}
export function Button({
  variant = "primary",
  size = "md",
  className,
  ...p
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...p} />;
}
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...p
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...p} />;
}

// ---------- StatusBadge ----------
export function StatusBadge({ group, value, className }: { group: StatusGroup; value: string; className?: string }) {
  return (
    <span
      className={cx(
        `status-${group}-${value}`,
        "inline-flex items-center gap-1.5 rounded-full px-2.5 text-xs leading-5 font-semibold whitespace-nowrap",
        className,
      )}
    >
      {value === "vencido" ? (
        <AlertTriangle aria-hidden className="size-3.5" />
      ) : (
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
      )}
      {statusLabel(group, value)}
    </span>
  );
}

// ---------- Form fields ----------
export const inputClass =
  "h-10 w-full rounded-md border border-border-input bg-bg px-3 text-base text-text placeholder:text-muted/80 aria-[invalid=true]:border-danger";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cx(inputClass, className)} {...p} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cx(inputClass, "pr-8", className)} {...p} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputClass, "h-auto min-h-20 py-2", className)} {...p} />;
}

// ---------- Layout bits ----------
export function Card({ className, ...p }: ComponentProps<"section">) {
  return <section className={cx("rounded-lg border border-border bg-bg shadow-card", className)} {...p} />;
}

export function PageHeader({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-0.5 text-2xl leading-8 font-bold break-words sm:text-[28px] sm:leading-[34px]">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success" | "info" | "warning"; children: ReactNode }) {
  const t = {
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
    info: "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-md px-4 py-3 text-sm font-medium", t)}>
      {children}
    </div>
  );
}

/** Línea de ECG del sticker, el único adorno de la marca. */
export function EcgLine({ className }: { className?: string }) {
  return (
    <svg
      className={cx("block h-7 w-full text-accent", className)}
      viewBox="0 0 600 40"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        points="0,20 228,20 238,10 248,20 270,20 280,26 296,0 310,34 320,20 352,20 364,13 376,20 600,20"
      />
    </svg>
  );
}

export function ArFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={cx("h-3.5 w-[21px]", className)} role="img" aria-label="Argentina">
      <rect width="30" height="20" rx="2" fill="#74acdf" />
      <rect y="6.67" width="30" height="6.66" fill="#fff" />
      <circle cx="15" cy="10" r="2" fill="#f6b40e" />
    </svg>
  );
}

export { cx };
