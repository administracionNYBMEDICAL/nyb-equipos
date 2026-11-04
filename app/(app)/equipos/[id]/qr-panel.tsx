"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ExternalLink, Printer, RefreshCw } from "lucide-react";
import { regenerateQrAction, type FormState } from "../actions";
import { Alert, Button, buttonClass } from "@/components/ui";

export function QrPanel({ equipmentId, code, token, svg }: { equipmentId: string; code: string; token: string; svg: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(regenerateQrAction.bind(null, equipmentId), {});
  return (
    <div className="flex flex-col gap-3">
      <div
        className="mx-auto w-40 [&_svg]:h-auto [&_svg]:w-full"
        role="img"
        aria-label={`Código QR del equipo ${code}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mono text-center">{code}</p>
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Link href={`/equipos/${equipmentId}/etiqueta`} className={buttonClass("accent", "md", "w-full")}>
        <Printer aria-hidden className="size-4" /> Imprimir etiqueta
      </Link>
      <Link
        href={`/q/${token}?vista=cliente`}
        target="_blank"
        className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-accent-strong"
      >
        Ver lo que ve el cliente <ExternalLink aria-hidden className="size-4" />
      </Link>
      <details className="rounded-md border border-border" key={state.stamp ?? 0} open={Boolean(state.errors)}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 text-sm font-semibold text-muted">
          <RefreshCw aria-hidden className="size-4" /> Cambiar QR
        </summary>
        <form action={action} className="flex flex-col gap-3 border-t border-border p-3">
          <p className="text-sm text-muted">Usalo si la etiqueta se perdió o se dañó. Se genera un QR nuevo y el actual deja de funcionar.</p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirm" className="mt-0.5 size-5 accent-[var(--color-danger)]" />
            Entiendo que la etiqueta pegada hoy deja de abrir la ficha
          </label>
          {state.errors?.confirm && <p role="alert" className="text-xs text-danger">{state.errors.confirm}</p>}
          <Button type="submit" variant="danger" disabled={pending}>{pending ? "Generando…" : "Generar QR nuevo"}</Button>
        </form>
      </details>
    </div>
  );
}
