"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Archive,
  ClipboardCheck,
  Gauge,
  Handshake,
  LogOut,
  Menu,
  MessageSquareWarning,
  Monitor,
  Users,
  Wrench,
  X,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Panel", icon: Gauge },
  { href: "/equipos", label: "Equipos", icon: Monitor },
  { href: "/taller", label: "Taller", icon: Wrench },
  { href: "/preventivos", label: "Preventivos", icon: ClipboardCheck },
  { href: "/reportes", label: "Reportes QR", icon: MessageSquareWarning, countKey: "tickets" as const },
  { href: "/prestamos", label: "Préstamos", icon: Handshake },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/informes", label: "Informes", icon: Archive },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md px-2 py-1">
      <Image src="/nyb-192.png" alt="" width={40} height={40} className="size-10" priority />
      <span className="leading-none">
        <span className="block text-lg font-bold tracking-wide text-on-brand">NYB</span>
        <span className="block text-[10px] font-semibold tracking-[0.3em] text-accent">MEDICAL</span>
      </span>
    </Link>
  );
}

export function AppShell({
  user,
  counts,
  children,
  signOut,
}: {
  user: { fullName: string; role: string };
  counts: { tickets: number };
  children: ReactNode;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  // El menú del celular queda abierto solo en la página donde se abrió: al navegar, se cierra solo.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Principal" className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, countKey }) => {
        const active = isActive(href);
        const count = countKey ? counts[countKey] : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-sm border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-accent bg-brand-hover text-on-brand"
                : "border-transparent text-brand-muted hover:bg-brand-hover hover:text-on-brand"
            }`}
          >
            <Icon aria-hidden className="size-4" />
            <span className="flex-1">{label}</span>
            {count > 0 && (
              <span className="rounded-full bg-accent px-2 text-[11px] leading-[18px] font-bold text-on-accent">
                {count}
                <span className="sr-only"> nuevos</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const userBox = (
    <div className="mt-auto border-t border-white/10 px-3 pt-3 text-[13px] text-brand-muted">
      <p className="truncate font-medium text-on-brand">{user.fullName}</p>
      <p>{user.role === "admin" ? "Administrador" : "Técnico"}</p>
      <form action={signOut} className="mt-2">
        <button type="submit" className="inline-flex items-center gap-2 rounded-sm py-1 text-brand-muted hover:text-on-brand">
          <LogOut aria-hidden className="size-4" /> Salir
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      {/* Escritorio */}
      <aside className="no-print sticky top-0 hidden h-dvh flex-col gap-4 bg-brand px-3 py-5 md:flex">
        <Brand />
        {nav}
        {userBox}
      </aside>

      {/* Celular */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between bg-brand px-3 md:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="relative inline-flex size-11 items-center justify-center rounded-md text-on-brand"
        >
          <Menu aria-hidden className="size-6" />
          {counts.tickets > 0 && <span className="absolute top-3 right-3 size-2 rounded-full bg-accent" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button className="absolute inset-0 bg-brand/50" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-3 overflow-y-auto rounded-t-lg bg-brand p-4 pb-6">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="inline-flex size-11 items-center justify-center rounded-md text-on-brand"
              >
                <X aria-hidden className="size-6" />
              </button>
            </div>
            {nav}
            {userBox}
          </div>
        </div>
      )}

      <main id="contenido" className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
